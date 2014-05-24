var jit = require('jit');

/**
 * Add a function to the rpc exports
 *
 * @param {String} name
 */

exports.rpc = function (name, fn) {
  this.prototype._rpc = this.prototype._rpc || {};
  fn = fn || this.prototype[name];
  if (!fn) throw new Error('rpc: '+ name + ' did not exist!');
  this.prototype._rpc[name] = fn;
  return this;
};

/**
 * Add an interval to run while the state is running.
 *
 * @param {Function} fn
 * @param {Number} timeout
 * @param {Number} maxTimeout [optional]
 */

exports.interval = function (fn, timeout) {
  var intervalFns = this.prototype._intervalFns;
  intervalFns.push(function (state) {
    return setInterval(fn.bind(state), timeout);
  });
  return this;
};

/**
 * Run an interval with some amount of jitter
 */

exports.jitter = function (fn, min, max) {
  var jitterFns = this.prototype._jitterFns;
  jitterFns.push(function (state) {
    return jit.interval(fn.bind(state), min, max);
  });
  return this;
};
