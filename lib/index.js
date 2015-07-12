"use strict";

var STATE_FULFILLED = "fullfilled";
var STATE_REJECTED = "rejected";
var STATE_PENDING = "pending";
var MARKER = new function() {};

var Promise = function(executor) {
  this.state = STATE_PENDING;
  this.value = void 0;
  this.queue = [];
  var self = this;
  var resolver = function(value) {
    if (self.state !== STATE_PENDING) { return; }
    self.state = STATE_FULFILLED;
    self.value = value;
    setTimeout(function() {
      self.queue.map(function(o, i) { // eslint-disable-line no-unused-vars
        o.onFulfilled(value);
      });
    }, 0);
  };
  var rejector = function(reason) {
    if (self.state !== STATE_PENDING) { return; }
    self.state = STATE_REJECTED;
    self.value = reason;
    setTimeout(function() {
      self.queue.map(function(o, i) { // eslint-disable-line no-unused-vars
        o.onRejected(reason);
      });
    }, 0);
  };
  if (executor !== MARKER) {
    executor(resolver, rejector);
  }
};
Promise.prototype.then = function(onFulfilled, onRejected) {
  var result = new Promise(MARKER);
  var self = this;
  if (this.state === STATE_REJECTED) {
    if (typeof onRejected === 'function') {
      setTimeout(function() { onRejected(self.value); }, 0);
    } else {
      return this;
    }
  } else if (this.state === STATE_FULFILLED) {
    if (typeof onFulfilled === 'function') {
      setTimeout(function() { onFulfilled(self.value); }, 0);
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
