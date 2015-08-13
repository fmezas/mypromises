"use strict";

var STATE_FULFILLED = "fullfilled";
var STATE_REJECTED = "rejected";
var STATE_PENDING = "pending";
var MARKER = new function() {};

var Promise, fulfill, reject;

function isPromise(value) {
  return value && value instanceof Promise;
}

function couldBeThenable(value) {
  return value
    && (typeof value === 'function' || typeof value === 'object');
}

function resolveWithPromise(promise, promiseValue) {
  promiseValue.then(
    function(nestedValue) { fulfill(promise, nestedValue); },
    function(nestedReason) { reject(promise, nestedReason); });
}

function resolveWithThenable(promise, thenable, then) {
  var resolved = false;
  try {
    then.call(thenable,
              function(value) {
                if (!resolved) {
                  resolved = true;
                  fulfill(promise, value);
                }
              },
              function(reason) {
                if (!resolved) {
                  resolved = true;
                  reject(promise, reason);
                }
              });
  } catch(e) {
    if (!resolved) {
      reject(promise, e);
    }
  }
}

function resolvePendingPromises(queuedInvocations, resolver) {
  setTimeout(function() {
    queuedInvocations.map(resolver);
  }, 0);
}

function makeDeferredInvocationsUponFulfillment(queuedInvocations, value) {
  resolvePendingPromises(queuedInvocations, function(queuedInvocation) {
      try {
        var onFulfilled = queuedInvocation.onFulfilled;
        if (typeof onFulfilled === 'function'){
          var nextValue = onFulfilled(value);
          fulfill(queuedInvocation.newPromise, nextValue);
        } else {
          fulfill(queuedInvocation.newPromise, value);
        }
      } catch(e) {
        reject(queuedInvocation.newPromise, e);
      }
  });
}

function makeDeferredInvocationsUponRejection(queuedInvocations, reason) {
  resolvePendingPromises(queuedInvocations, function(queuedInvocation) {
      try {
        var onRejected = queuedInvocation.onRejected;
        if (typeof onRejected === 'function') {
          var nextValue = onRejected(reason);
          fulfill(queuedInvocation.newPromise, nextValue);
        } else {
          reject(queuedInvocation.newPromise, reason);
        }
      } catch(e) {
        reject(queuedInvocation.newPromise, e);
      }
  });
}

function makeAsyncResolver(promise, handler, value) {
  return function() {
    try {
      var nextValue = handler(value); // reject next promise with this value
      if (nextValue === promise) {
        reject(promise, new TypeError());
      } else {
        fulfill(promise, nextValue);
      }
    } catch(e) {
      reject(promise, e);
    }
  };
}

fulfill = function(promise, value) {
  if (promise.state !== STATE_PENDING) { return; }

  if (isPromise(value)) {
    resolveWithPromise(promise, value);
    return;
  } else {
    if (couldBeThenable(value)) {
      var then = null;
      try {
        then = value.then;
      } catch(e) {
        reject(promise, e);
        return;
      }
      // if value is a thenable
      if (typeof then === 'function') {
        resolveWithThenable(promise, value, then);
        return;
      }
    }
  }

  promise.state = STATE_FULFILLED;
  promise.value = value;

  makeDeferredInvocationsUponFulfillment(promise.queue, value);
};

reject = function(promise, reason) {
  if (promise.state !== STATE_PENDING) { return; }

  promise.state = STATE_REJECTED;
  promise.value = reason;

  makeDeferredInvocationsUponRejection(promise.queue, reason);
};

Promise = function(executor) {
  if (!(this instanceof Promise)) {
    return new Promise(executor);
  }
  this.state = STATE_PENDING;
  this.value = void 0;
  this.queue = [];
  var self = this;
  if (executor !== MARKER) {
    executor(
      function(value) { fulfill(self, value); },
      function(reason) { reject(self, reason); });
  }
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  var result = new Promise(MARKER);
  if (this.state === STATE_PENDING) {
    // enqueue new promise for future resolution
    this.queue.push({'newPromise': result,
                     'onFulfilled': onFulfilled,
                     'onRejected': onRejected});
  } else {
    // ignore non-function handlers otherwise immediately resolve new promise
    var handler;
    if (this.state === STATE_REJECTED) {
      handler = onRejected;
    } else {
      handler = onFulfilled;
    }
    if (typeof handler !== 'function') {
      return this;
    }
    setTimeout(makeAsyncResolver(result, handler, this.value), 0);
  }
  return result;
};

module.exports = Promise;
