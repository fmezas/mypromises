"use strict";

var STATE_FULFILLED = "fullfilled";
var STATE_REJECTED = "rejected";
var STATE_PENDING = "pending";
var MARKER = new function() {};

var Promise, resolver, rejector;

function isPromise(value) {
  return value && value instanceof Promise;
}

function couldBeThenable(value) {
  return value
    && (typeof value === 'function' || typeof value === 'object');
}

function resolveWithPromise(promise, promiseValue) {
    if (promiseValue.state === STATE_PENDING) {
      promiseValue.then(
        function(nestedValue) {
          resolver(promise, nestedValue);
        },
        function(nestedReason) {
          rejector(promise, nestedReason);
        });
    } else if (promiseValue.state === STATE_REJECTED) {
      rejector(promise, promiseValue.value);
    } else if (promiseValue.state === STATE_FULFILLED) {
      resolver(promise, promiseValue.value);
    }
}

function resolveWithThenable(promise, thenable, then) {
  var resolved = false;
  try {
    then.call(thenable,
              function(nestedValue) {
                if (!resolved) {
                  resolved = true;
                  resolver(promise, nestedValue);
                }
              },
              function(nestedReason) {
                if (!resolved) {
                  resolved = true;
                  rejector(promise, nestedReason);
                }
              });
  } catch(e) {
    if (!resolved) {
      rejector(promise, e);
    }
  }
}

function makeDeferredInvocationsUponFulfillment(queuedInvocations, value) {
  setTimeout(function() {
    queuedInvocations.map(function(queuedInvocation, _) { // eslint-disable-line no-unused-vars
      try {
        var onFulfilled = queuedInvocation.onFulfilled;
        if (typeof onFulfilled === 'function'){
          var nextValue = onFulfilled(value);
          resolver(queuedInvocation.newPromise, nextValue);
        } else {
          resolver(queuedInvocation.newPromise, value);
        }
      } catch(e) {
        rejector(queuedInvocation.newPromise, e);
      }
    });
  }, 0);
}

function makeDeferredInvocationsUponRejection(queuedInvocations, reason) {
  setTimeout(function() {
    queuedInvocations.map(function(queuedInvocation, _) { // eslint-disable-line no-unused-vars
      try {
        var onRejected = queuedInvocation.onRejected;
        if (typeof onRejected === 'function') {
          var nextValue = onRejected(reason);
          resolver(queuedInvocation.newPromise, nextValue);
        } else {
          rejector(queuedInvocation.newPromise, reason);
        }
      } catch(e) {
        rejector(queuedInvocation.newPromise, e);
      }
    });
  }, 0);
}

resolver = function(promise, value) {
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
        rejector(promise, e);
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

rejector = function(promise, reason) {
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
      function(value) { resolver(self, value); },
      function(reason) { rejector(self, reason); });
  }
};

function makeAsyncResolver(promise, handler, value) {
  return function() {
    try {
      var nextValue = handler(value); // reject next promise with this value
      if (nextValue === promise) {
        rejector(promise, new TypeError());
      } else {
        resolver(promise, nextValue);
      }
    } catch(e) {
      rejector(promise, e);
    }
  };
}

Promise.prototype.then = function(onFulfilled, onRejected) {
  var result = new Promise(MARKER);

  // ignore non-function handlers
  if ((this.state === STATE_REJECTED && typeof onRejected !== 'function')
     || (this.state === STATE_FULFILLED && typeof onFulfilled !== 'function')) {
    return this;
  }

  if (this.state === STATE_PENDING) {
    this.queue.push({'newPromise': result,
                     'onFulfilled': onFulfilled,
                     'onRejected': onRejected});
  } else {
    var value = this.value;
    if (this.state === STATE_REJECTED) {
      setTimeout(makeAsyncResolver(result, onRejected, value), 0);
    } else if (this.state === STATE_FULFILLED) {
      setTimeout(makeAsyncResolver(result, onFulfilled, value), 0);
    }
  }
  return result;
};

module.exports = Promise;
