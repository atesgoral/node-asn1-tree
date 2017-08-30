import test from 'ava';

const asn1Tree = require('..');

const CLS_UNIVERSAL = 0;

const FORM_PRIMITIVE = 0;
const FORM_CONSTRUCTED = 1;

const TAG_OCTET_STRING = 4;
const TAG_NULL = 5;
const TAG_SEQUENCE = 16;

/* Helpers */

// Return buffer of given length, with deterministic content
const b = (length) => Buffer.from(
  Array(length)
    .fill(0)
    .map((n, i) => i % 256)
);

// Decode buffer filled with given array
const d = (...a) => asn1Tree.decode(
  a.reduce((b, i) => Buffer.concat([
    b,
    i instanceof Buffer ? i : Buffer.from([ i ])
  ]), Buffer.from([]))
);

test('decode tag 0', (t) => {
  t.is(
    d(0),
    null
  );
});

test('decode tagCode 0b11111', (t) => {
  t.throws(() => {
    d(0b11111);
  }, 'Extended tags are not supported');
});

test('primitive: element with length 0', (t) => {
  t.deepEqual(
    d(TAG_NULL, 0),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_NULL,
      value: null
    }
  );
});

test('primitive: element with short length', (t) => {
  t.deepEqual(
    d(TAG_OCTET_STRING, 3, b(3)),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: b(3)
    }
  );
});

test('primitive: element with short length = 127', (t) => {
  t.deepEqual(
    d(TAG_OCTET_STRING, 127, b(127)),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: b(127)
    }
  );
});

test('primitive: element with long length', (t) => {
  t.deepEqual(
    d(TAG_OCTET_STRING, 128 | 2, 5000 >> 8, 5000 & 255, b(5000)),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: b(5000)
    }
  );
});

test('constructed: element with indefinite length', (t) => {
  t.deepEqual(
    d(FORM_CONSTRUCTED << 5 | TAG_SEQUENCE, 128, TAG_OCTET_STRING, 3, b(3), 0),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_CONSTRUCTED,
      tagCode: TAG_SEQUENCE,
      elements: [{
        cls: CLS_UNIVERSAL,
        form: FORM_PRIMITIVE,
        tagCode: 4,
        value: b(3)
      }]
    }
  );
});
