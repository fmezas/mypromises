'use strict';

var Promise = require('../lib');

var adapter = {};
adapter.deferred = function () {
  var pending = {};
  pending.promise = new Promise(function(onFulfilled, onRejected) {
    pending.resolve = onFulfilled;
    pending.reject = onRejected;
  });
  return pending;
};
adapter.resolved = function (value) {
  var d = adapter.deferred();
  d.resolve(value);
  return d.promise;
};
adapter.rejected = function (reason) {
  var d = adapter.deferred();
  d.reject(reason);
  return d.promise;
};

function mocha(_adapter) {
  global.adapter = _adapter;
  require("../node_modules/promises-aplus-tests/lib/tests/2.1.2");
  require("../node_modules/promises-aplus-tests/lib/tests/2.1.3");
  require("../node_modules/promises-aplus-tests/lib/tests/2.2.1");
  require("../node_modules/promises-aplus-tests/lib/tests/2.2.2");
  require("../node_modules/promises-aplus-tests/lib/tests/2.2.3");
  require("../node_modules/promises-aplus-tests/lib/tests/2.2.4");
  require("../node_modules/promises-aplus-tests/lib/tests/2.2.5");
  // require("../node_modules/promises-aplus-tests/lib/tests/2.2.6");
  // require("../node_modules/promises-aplus-tests/lib/tests/2.2.7");
  delete global.adapter;
}

describe('Promises/A+ Tests', function () {  // eslint-disable-line no-undef
  mocha(adapter);
});
