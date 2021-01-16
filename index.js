const FORM_PRIMITIVE = 0;

function decode(buffer) {
  let bytesRead = 0;

  let tag = buffer.readUInt8(bytesRead);
  bytesRead += 1;

  const cls = tag >> 6;
  const form = tag >> 5 & 1;
  let tagCode = tag & 0b11111;

  if (tagCode === 0b11111) {
    tagCode = 0;
    let byte;

    do {
      byte = buffer.readUInt8(bytesRead);
      bytesRead += 1;
      tagCode = (tagCode << 7) | (byte & 0x7f);
    } while (byte & 0x80);
  }

  let elementLength = buffer.readUInt8(bytesRead);
  bytesRead += 1;

  if (tag === 0 && elementLength === 0) {
    // End-of-contents indicator
    return { element: null, bytesRead };
  }

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
    cls,
    form,
    tagCode
  };

  if (form === 0) { // Primitive
    const value = elementLength
      ? buffer.slice(bytesRead, bytesRead + elementLength)
      : Buffer.from([]);
    bytesRead += elementLength;

    element.value = value;
  } else {
    const elements = [];

    while (!elementLength || bytesRead - 2 < elementLength) {
      const result = decode(buffer.slice(bytesRead));

      bytesRead += result.bytesRead;

      if (result.element === null) {
        // End-of-contents indicator reached
        break;
      }

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

    const tag = element.cls << 6
      | element.form << 5
      | element.tagCode;

    buffer.writeUInt8(tag, offset + bytesWritten);
    bytesWritten += 1;

    if (element.form === FORM_PRIMITIVE) {
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
