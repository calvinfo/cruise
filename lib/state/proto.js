var Emitter = require('events').EventEmitter;
var once = require('once');

/**
 * Return all the RPC calls for this state. Make sure they are bound to the
 * prototype
 *
 * @return {Object} rpcs  { name: call }
 */

exports.rpc = function(){
  var rpc = {};
  for (var key in this._rpc) rpc[key] = wrap(this._rpc[key]).bind(this);
  return rpc;
};

/**
 * Wrap an rpc call to include some additional information about
 * the state of the sending and receiving nodes.
 */

function wrap(rpc){
  return function(req, callback){
    var self = this;
    rpc.call(this, req, function(err, res){
      res = res || {};
      res.term = self.node.term();
      res._from = self.node.addr();
      callback(err, res);
    });
  }
}

/**
 * Stops the current state
 */

exports.stop = function(){
  this._stopped = true;
  this.debug('stopping %s', this.name);
  var intervals = this._intervals || [];
  var jitters = this._jitters || [];
  intervals.forEach(function(interval){ clearInterval(interval); });
  jitters.forEach(function(clear){ clear(); });
  return this;
};

/**
 * Returns whether the state has been stopped
 *
 * @return {Boolean}
 */

exports.stopped = function(){
  return this._stopped;
};

/**
 * Start the current state
 */

exports.start = function () {
  this._stopped = false;
  this.debug('starting %s', this.name);
  var intervals = this._intervals = this._intervals || [];
  var jitters = this._jitters = this._jitters || [];
  var self = this;
  this._intervalFns.forEach(function(fn){ intervals.push(fn(self)); });
  this._jitterFns.forEach(function(fn){ jitters.push(fn(self)); });
  this.init();
  return this;
};

/**
 * Init function, defaults to a noop
 */

exports.init = function(){};

/**
 * Calls an RPC on all of the server's peers. Returns an event emitter
 * which emits on every response from one of the peers.
 *
 * @param {String} name  the name of the RPC to execute
 * @param {Object} req  the request object
 */

exports.send = function(name, req){
  var node = this.node;
  var peers = node.peers();
  req = req || {};
  req.term = node.term();
  req._type = name;
  req._from = node.addr();

  var emitter = new Emitter();
  peers.forEach(function (peer) {
    node.debug('calling %s: %s', peer.addr(), name);
    peer.call(name, req, function(err, res){
      node.debug('received from %s: %j', node.addr(), res);
      emitter.emit('res', { body: res, err: err });
    });
  });
  return emitter;
};

/**
 * Send to `req` to all nodes and call `name`. On a quorum, call the
 * callback.
 *
 * @param {String} name  rpc method name
 * @param {Object} req
 * @param {Function} fn
 */

exports.quorum = function(name, req, fn){
  var node = this.node;
  var successes = 0;
  var failures = 0;
  var quorum = Math.floor(node.peers().length / 2) + 1;
  var self = this;
  fn = once(fn || function(){});
  if (node.peers().length === 0) return fn(null, true);

  this.debug('sending %s: %j', name, req);
  this.send(name, req).on('res', function(res){
    var err = res.err;
    res = res.body;
    if (err) {
      failures++;
      self.debug('error: %s', err);
      if (failures >= quorum) fn(null, false);
      return;
    }

    if (res.success) successes++;
    else failures++;

    self.debug('%s, +%d -%d %j', name, successes, failures, res._from);
    if (self.stepDown(res)) return fn(null, false);
    if (successes >= quorum) return fn(null, true);
    if (failures >= quorum) return fn(null, false);
  });

  /**
   * Set a timeout if not enough of the nodes respond.
   */

  setTimeout(function(){
    fn(null, false);
  }, 1000);
};

/**
 * Decides whether the node should step down
 * as the leader.
 *
 * @param {Message} msg
 * @return {Boolean} whether the node stepped down
 */

exports.stepDown = function(msg){
  var term = this.node.term();
  if (term >= msg.term) return false;
  this.debug('stepping down %d, %j', term, msg);
  this.emit('change', 'follower');
  this.node.term(msg.term);
  return true;
};