## Synopsis

Implementation of the Promises/A+ specification

## Code Example

You know, the usual:

```javascript
var Promise = require('mypromises');

var f, r;
var p = new Promise(function(onFulfill, onReject) {
  f = onFulfill;
  r = onReject;
});

// fulfill with the solution
f(42);
// or reject
// r('boom!');

// and so on...
// p.then(...);
```

## Motivation

This is just a naive implementation I wrote to make sure I fully understood the [Promises/A+ spec](https://promisesaplus.com/). If you are like me and had trouble following all the promise resolution cases in your head while reading the spec, then examining the code of this implementation might help you.

I've tried to give code clarity priority over any other consideration:

- pure functions except where side effects are expected per the spec (resolving Promise's)
- objects (Promise's) mostly just contain data

My next step is to optimize for performance. Comments are welcome.

## Installation

```
npm install mypromises
```

## Tests

```
npm run-script node
```

## Copyright and License

The MIT License (MIT)

Copyright © 2013 Francisco Meza

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
