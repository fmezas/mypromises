"use strict";

var STATE_FULFILLED = "fullfilled";
var STATE_REJECTED = "rejected";
var STATE_PENDING = "pending";
var MARKER = new function() {};

var Promise, resolver, rejector;

resolver = function(promise, value) {
  if (promise.state !== STATE_PENDING) { return; }

  //if value is a pending promise, adopt its state
  if (value && value instanceof Promise) {
    if (value.state === STATE_PENDING) {
      value.then(
        function(nestedValue) {
          resolver(promise, nestedValue);
        },
        function(nestedReason) {
          rejector(promise, nestedReason);
        });
    } else if (value.state === STATE_REJECTED) {
      rejector(promise, value.value);
    } else if (value.state === STATE_FULFILLED) {
      resolver(promise, value.value);
    }
    return;
  } else {
    if (value && (typeof value === 'function' || typeof value === 'object')) {
      try {
        var then = value.then;
        if (typeof then === 'function') {
          var nestedResolver, nestedRejector;
          var resolved = false;
          (function() {
            nestedResolver = function(nestedValue) {
              if (!resolved) {
                resolved = true;
                resolver(promise, nestedValue);
              }
            };
            nestedRejector = function(nestedReason) {
              if (!resolved) {
                resolved = true;
                rejector(promise, nestedReason);
              }
            };
          })();
          try {
            then.call(value,
                      nestedResolver,
                      nestedRejector);
            return;
          } catch(e) {
            if (!resolved) {
              rejector(promise, e);
            }
            return;
          }
        }
      } catch(e) {
        rejector(promise, e);
        return;
      }
    }
  }

  promise.state = STATE_FULFILLED;
  promise.value = value;

  setTimeout(function() {
    promise.queue.map(function(o, i) { // eslint-disable-line no-unused-vars
      try {
        var onFulfilled = o.onFulfilled;
        if (typeof onFulfilled === 'function'){
          var nextValue = onFulfilled(value);
          resolver(o.newPromise, nextValue);
        } else {
          resolver(o.newPromise, value);
        }
      } catch(e) {
        rejector(o.newPromise, e);
      }
    });
  }, 0);
};

rejector = function(promise, reason) {
  if (promise.state !== STATE_PENDING) { return; }
  promise.state = STATE_REJECTED;
  promise.value = reason;

  setTimeout(function() {
    promise.queue.map(function(o, i) { // eslint-disable-line no-unused-vars
      try {
        var onRejected = o.onRejected;
        if (onRejected && typeof onRejected === 'function') {
          var nextReason = onRejected(promise.value); // reject next promise with this value
          resolver(o.newPromise, nextReason);
        } else {
          rejector(o.newPromise, promise.value);
        }
      } catch(e) {
        rejector(o.newPromise, e);
      }
    });
  }, 0);
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
      function(value) {
        resolver(self, value);
      }, function(reason) {
        rejector(self, reason);
      });
  }
};
Promise.prototype.then = function(onFulfilled, onRejected) {
  var result = new Promise(MARKER);
  var self = this;
  if (this.state === STATE_REJECTED) {
    if (typeof onRejected === 'function') {
      setTimeout(function() {
        try {
          var nextReason = onRejected(self.value); // reject next promise with this value
          if (nextReason === result) {
            rejector(result, new TypeError());
          } else {
            resolver(result, nextReason);
          }
        } catch(e) {
          rejector(result, e);
        }
      }, 0);
    } else {
      return this;
    }
  } else if (this.state === STATE_FULFILLED) {
    if (typeof onFulfilled === 'function') {
      setTimeout(function() {
        try {
          var nextValue = onFulfilled(self.value); // resolve next promise with this value
          if (nextValue === result) {
            rejector(result, new TypeError());
          } else {
            resolver(result, nextValue);
          }
        } catch(e) {
          rejector(result, e);
        }
      }, 0);
    } else {
      return this;
    }
  } else if (this.state === STATE_PENDING) {
    this.queue.push({'newPromise': result,
                     'onFulfilled': onFulfilled,
                     'onRejected': onRejected});
  }
  return result;
};

module.exports = Promise;
