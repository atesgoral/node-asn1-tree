const elementClassList = [
  'UNIVERSAL',
  'APPLICATION-WIDE',
  'CONTEXT-SPECIFIC',
  'PRIVATE-USE'
];

const elementFormList = [
  'PRIMITIVE',
  'CONSTRUCTED'
];

const universalTags = {
  'BOOLEAN': 1,
  'INTEGER': 2,
  'BIT STRING': 3,
  'OCTET STRING': 4,
  'NULL': 5,
  'OBJECT IDENTIFIER': 6,
  'ObjectDescriptor': 7,
  'INSTANCE OF': 8,
  'EXTERNAL': 8,
  'REAL': 9,
  'ENUMERATED': 10,
  'EMBEDDED PDV': 11,
  'UTF8String': 12,
  'RELATIVE-OID': 13,
  'SEQUENCE': 16,
  'SEQUENCE OF': 16,
  'SET': 17,
  'SET OF': 17,
  'NumericString': 18,
  'PrintableString': 19,
  'TeletexString': 20,
  'T61String': 20,
  'VideotexString': 21,
  'IA5String': 22,
  'UTCTime': 23,
  'GeneralizedTime': 24,
  'GraphicString': 25,
  'VisibleString': 26,
  'ISO646String': 26,
  'GeneralString': 27,
  'UniversalString': 28,
  'CHARACTER STRING': 29,
  'BMPString': 30
};

const constructedTypes = {
  'SEQUENCE': 1,
  'SEQUENCE OF': 1,
  'SET': 1,
  'SET OF': 1,
  'CHOICE': 1
};

const decoders = {
  'NULL': () => true,
  'INTEGER': (value) => {
    return value.readIntBE(0, value.length);
  },
  // 'ENUMERATED': (value, definition) => {
  'ENUMERATED': (value) => {
    // const itemValue = value.readIntBE(0, value.length);
    // const item = definition.values.find((item) => itemValue === item.value);
    // return item ? item.name : itemValue;
    return value.readIntBE(0, value.length);
  }
};

function decode(buffer) {
  let bytesRead = 0;

  let tag = buffer.readUInt8(bytesRead);
  bytesRead += 1;

  if (tag === 0) {
    return { element: null };
  }

  const cls = tag >> 6;
  const form = tag >> 5 & 1;
  const tagCode = tag & 0b11111;

  if (tagCode === 0b11111) {
    throw new Error('Extended tags are not supported');
  }

  let elementLength = buffer.readUInt8(bytesRead);
  bytesRead += 1;

  if (elementLength < 128) {
    // Short form length, do nothing
  } else if (elementLength === 128) {
    elementLength = undefined;
  } else {
    const lengthLength = elementLength & 127;
    elementLength = buffer.readUIntBE(bytesRead, lengthLength);
    bytesRead += lengthLength;
  }

  const element = {
    cls: elementClassList[cls],
    form: elementFormList[form],
    tagCode
  };

  if (form === 0) { // Primitive
    const value = elementLength
      ? buffer.slice(bytesRead, bytesRead + elementLength)
      : null;
    bytesRead += elementLength;

    element.value = value;
  } else {
    const elements = [];

    while (!elementLength || bytesRead - 2 < elementLength) {
      const result = decode(buffer.slice(bytesRead));

      if (!result.element) {
        // End-of-contents indicator reached
        bytesRead += 1;
        break;
      }

      bytesRead += result.bytesRead;

      elements.push(result.element);
    }

    element.elements = elements;
  }

  return {
    element,
    bytesRead
  };
}

function encode(element) {
  function enc(element, buffer, offset) {
    let bytesWritten = 0;

    function writeLength(length) {
      if (length < 128) {
        buffer.writeUInt8(length, offset + bytesWritten);
        bytesWritten += 1;
      } else if (!length) {
        throw new Error('Encoding of indefinite length elements is not supported');
        // buffer.writeUInt8(128, bytesWritten);
        // bytesWritten += 1;
      } else {
        const lengthLength = Math.ceil(Math.log2(length) / 8);
        buffer.writeUInt8(0x80 | lengthLength, offset + bytesWritten);
        bytesWritten += 1;
        buffer.writeUIntBE(length, offset + bytesWritten, lengthLength);
        bytesWritten += lengthLength;
      }
    }

    if (element.tagCode > 0b11110) {
      throw new Error('Extended tags are not supported');
    }

    const tag = element.tagCode
      | elementFormList.indexOf(element.form) << 5
      | elementClassList.indexOf(element.cls) << 6;

    buffer.writeUInt8(tag, offset + bytesWritten);
    bytesWritten += 1;

    if (element.form === 'PRIMITIVE') {
      writeLength(element.value.length);

      buffer.write(element.value.toString('binary'), offset + bytesWritten, element.value.length, 'binary');
      bytesWritten += element.value.length;
    } else {
      const tmpBuffer = Buffer.allocUnsafe(1024);
      const tmpBytesWritten = element.elements.reduce((bytesWritten, element) => bytesWritten + enc(element, tmpBuffer, bytesWritten), 0);

      writeLength(tmpBytesWritten);

      buffer.write(tmpBuffer.slice(0, tmpBytesWritten).toString('binary'), offset + bytesWritten, tmpBytesWritten, 'binary');
      bytesWritten += tmpBytesWritten;
    }

    return bytesWritten;
  }

  const buffer = Buffer.allocUnsafe(1024);
  const bytesWritten = enc(element, buffer, 0);

  return buffer.slice(0, bytesWritten);
}

module.exports = Object.freeze({
  decode: (buffer) => decode(buffer).element,
  encode
});
