import test from 'ava';

const asn1Tree = require('..');

const CLS_UNIVERSAL = 0;
const CLS_CONTEXT_SPECIFIC = 2;

const FORM_PRIMITIVE = 0;
const FORM_CONSTRUCTED = 1;

const TAG_INTEGER = 2;
const TAG_OCTET_STRING = 4;
const TAG_NULL = 5;
const TAG_SEQUENCE = 16;

/* Helpers */

// Compose tag
const tag = (cls, form, code) => cls << 6 | form << 5 | code;

// Return buffer of given length, filled with deterministic content
const f = (length) => Buffer.from(
  Array(length)
    .fill(0)
    .map((n, i) => i % 256)
);

// Compose buffer filled with given array
const b = (...a) => a.reduce((b, i) => Buffer.concat([
  b,
  i instanceof Buffer ? i : Buffer.from([ i ])
]), Buffer.from([]));

test('decode: tag 0', (t) => {
  t.is(
    asn1Tree.decode(b(tag(CLS_UNIVERSAL, FORM_PRIMITIVE, 0), 0)),
    null
  );
});

test('decode: tagCode 50 (extended tag / aka high tag)', (t) => {
  t.deepEqual(
    asn1Tree.decode(b(tag(CLS_CONTEXT_SPECIFIC, FORM_PRIMITIVE, 31), 50, 3, f(3))),
    {
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 50,
      value: f(3)
    }
  );
});

test('decode: tagCode 257 (extended tag / aka high tag with three octets)', (t) => {
  t.deepEqual(
    asn1Tree.decode(b(tag(CLS_CONTEXT_SPECIFIC, FORM_PRIMITIVE, 31), 130, 1, 3, f(3))),
    {
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 257,
      value: f(3)
    }
  );
});

test('decode: primitive: element with length 0', (t) => {
  t.deepEqual(
    asn1Tree.decode(b(tag(CLS_UNIVERSAL, FORM_PRIMITIVE, TAG_NULL), 0)),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_NULL,
      value: f(0)
    }
  );
});

test('decode: primitive: element with short length', (t) => {
  t.deepEqual(
    asn1Tree.decode(b(tag(CLS_UNIVERSAL, FORM_PRIMITIVE, TAG_OCTET_STRING), 3, f(3))),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: f(3)
    }
  );
});

test('decode: primitive: element with short length = 127', (t) => {
  t.deepEqual(
    asn1Tree.decode(b(tag(CLS_UNIVERSAL, FORM_PRIMITIVE, TAG_OCTET_STRING), 127, f(127))),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: f(127)
    }
  );
});

test('decode: primitive: element with long length', (t) => {
  t.deepEqual(
    asn1Tree.decode(b(tag(CLS_UNIVERSAL, FORM_PRIMITIVE, TAG_OCTET_STRING), 128 | 2, 5000 >> 8, 5000 & 255, f(5000))),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: f(5000)
    }
  );
});

test('decode: constructed: element with indefinite length', (t) => {
  t.deepEqual(
    asn1Tree.decode(b(
      tag(CLS_UNIVERSAL, FORM_CONSTRUCTED, TAG_SEQUENCE), 128,
        tag(CLS_UNIVERSAL, FORM_PRIMITIVE, TAG_OCTET_STRING), 3, f(3),
        0, 0
    )),
    {
      cls: CLS_UNIVERSAL,
      form: FORM_CONSTRUCTED,
      tagCode: TAG_SEQUENCE,
      elements: [{
        cls: CLS_UNIVERSAL,
        form: FORM_PRIMITIVE,
        tagCode: 4,
        value: f(3)
      }]
    }
  );
});

test('encode:', (t) => {
  t.deepEqual(
    asn1Tree.encode(
      { cls: CLS_UNIVERSAL, form: FORM_CONSTRUCTED, tagCode: TAG_SEQUENCE, elements: [
        { cls: CLS_CONTEXT_SPECIFIC, form: FORM_PRIMITIVE, tagCode: 0, value: f(10) },
        { cls: CLS_UNIVERSAL, form: FORM_PRIMITIVE, tagCode: TAG_INTEGER, value: f(1) }
      ] }
    ),
    b(
      tag(CLS_UNIVERSAL, FORM_CONSTRUCTED, TAG_SEQUENCE), 12 + 3,
        tag(CLS_CONTEXT_SPECIFIC, FORM_PRIMITIVE, 0), 10, f(10), // 12
        tag(CLS_UNIVERSAL, FORM_PRIMITIVE, TAG_INTEGER), 1, f(1) // 3
    )
  );
});

