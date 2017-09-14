[![Travis CI](https://img.shields.io/travis/atesgoral/node-asn1-tree.svg)](https://travis-ci.org/atesgoral/node-asn1-tree)
[![Coverage Status](https://img.shields.io/coveralls/atesgoral/node-asn1-tree.svg)](https://coveralls.io/github/atesgoral/node-asn1-tree?branch=master)
[![NPM Package](https://img.shields.io/npm/v/asn1-tree.svg)](https://www.npmjs.com/package/asn1-tree)

# asn1-tree

Yet another ASN.1 encoder/decoder in JavaScript. Parses a binary ASN.1 buffer into a JavaScript object that describes the ASN.1 structure. Nested elements form a tree, and hence the name "asn1-tree", and a primitive value would just result in an object.

This is just an encoder/decoder. The interpretation of the structure (i.e. matching against a schema) is beyond the scope of this library. See [asn1-mapper](https://www.npmjs.com/package/asn1-mapper), an ASN.1 schema mapper, for that purpose.

## Installation

```
npm install --save asn1-tree
```

## Usage

```
const asn1Tree = require('asn1-tree');

const buffer = Buffer.from('3080800803221200644241f40201028301010000', 'hex');

const element = asn1Tree.decode(buffer);
```

The value of `element` will be:

```
{
  cls: 0,
  form: 1,
  tagCode: 16,
  elements: [{
    cls: 2,
    form: 0,
    tagCode: 0,
    value: Buffer.from([ 3, 34, 18, 0, 100, 66, 65, 244 ])
  }, {
    cls: 0,
    form: 0,
    tagCode: 2,
    value: Buffer.from([ 2 ])
  }, {
    cls: 2,
    form: 0,
    tagCode: 3,
    value: Buffer.from([ 1 ])
  }]
}
```

Going back:

```
const buffer = asn1Tree.encode(element);
```
