var bind = require('bind-all');
var debug = require('debug');
var Emitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var proto = require('./proto');
var rpc = require('./rpc');
var statics = require('./statics');
var tick = process.nextTick;

/**
 * Create a new constructor with `name`
 */

module.exports = function(name){

  /**
   * Cruise State constructor
   */

  function State(node){
    if (!(this instanceof State)) return new State(node);
    this.node = node;
    var self = this;
    tick(function (){
      State.emit('construct', self);
    });
  }

  /**
   * Mixin EventEmitter
   */

  State.__proto__ = Emitter.prototype;

  /**
   * Inherit instance from emitter
   */

  inherits(State, Emitter);

  /**
   * Add the statics, prototypes and rpc functions
   */

  State.name = name;
  State.prototype.name = name;
  State.prototype._intervalFns = [];
  State.prototype._jitterFns = [];

  for (var key in statics) State[key] = statics[key];
  for (var key in proto) State.prototype[key] = proto[key];
  for (var key in rpc) State.rpc(key, rpc[key]);

  return State;
};