"use strict";

var STATE_FULFILLED = "fullfilled";
var STATE_REJECTED = "rejected";
var STATE_PENDING = "pending";
var MARKER = new function() {};

var Promise, fulfill, reject;

function callLater(fun) {
  setTimeout(fun, 0);
}

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
  callLater(function() { queuedInvocations.map(resolver); });
}

function makeDependentPromiseResolver(value, fulfilling) {
  return function(queuedInvocation) {
    try {
      var handler = fulfilling ? queuedInvocation.onFulfilled : queuedInvocation.onRejected;
      if (typeof handler === 'function') {
        var nextValue = handler(value);
        fulfill(queuedInvocation.newPromise, nextValue);
      } else {
        if (fulfilling) {
          fulfill(queuedInvocation.newPromise, value);
        } else {
          reject(queuedInvocation.newPromise, value);
        }
      }
    } catch(e) {
      reject(queuedInvocation.newPromise, e);
    }
  };
}

function resolvePendingPromisesUponFulfillment(queuedInvocations, value) {
  resolvePendingPromises(queuedInvocations, makeDependentPromiseResolver(value, true));
}

function resolvePendingPromisesUponRejection(queuedInvocations, reason) {
  resolvePendingPromises(queuedInvocations, makeDependentPromiseResolver(reason, false));
}

function makeResolver(promise, handler, value) {
  return function() {
    try {
      var nextValue = handler(value);
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
      if (typeof then === 'function') {
        resolveWithThenable(promise, value, then);
        return;
      }
    }
  }

  promise.state = STATE_FULFILLED;
  promise.value = value;

  resolvePendingPromisesUponFulfillment(promise.queue, value);
};

reject = function(promise, reason) {
  if (promise.state !== STATE_PENDING) { return; }

  promise.state = STATE_REJECTED;
  promise.value = reason;

  resolvePendingPromisesUponRejection(promise.queue, reason);
};

Promise = function(executor) {
  if (!(this instanceof Promise)) {
    return new Promise(executor);
  }
  this.state = STATE_PENDING;
  this.value = void 0;
  this.queue = [];
  if (executor !== MARKER) {
    var promiseToBeResolved = this;
    executor(
      function(value) { fulfill(promiseToBeResolved, value); },
      function(reason) { reject(promiseToBeResolved, reason); });
  }
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  var result = new Promise(MARKER);
  if (this.state === STATE_PENDING) {
    // remember pending dependent promise
    this.queue.push({'newPromise': result,
                     'onFulfilled': onFulfilled,
                     'onRejected': onRejected});
  } else {
    // ignore non-function handlers
    var handler;
    if (this.state === STATE_REJECTED) {
      handler = onRejected;
    } else {
      handler = onFulfilled;
    }
    if (typeof handler !== 'function') {
      return this;
    }
    // otherwise resolve newly created dependent promise
    callLater(makeResolver(result, handler, this.value));
  }
  return result;
};

module.exports = Promise;
