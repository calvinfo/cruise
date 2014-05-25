var axon = require('axon');
var debug = require('debug')('cruise:node');
var Emitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var rpc = require('axon-rpc');
var Candidate = require('./candidate');
var Follower = require('./follower');
var Leader = require('./leader');
var Log = require('./log');
var Peer = require('./peer');

/**
 * Set up our states
 */

var states = {
  candidate: Candidate,
  follower: Follower,
  leader: Leader
};

/**
 * Export the `Node` constructor
 */

module.exports = Node;

/**
 * `Node` contstructor
 *
 * @param {String} addr  the connection string '127.0.0.1:4001'
 */

function Node(addr){
  if (!(this instanceof Node)) return new Node(addr);
  this._peers = [];
  this._term = 0;
  this._log = new Log(this);
  this.addr(addr);
  this.heartbeat(Date.now());
  this.state('follower');
}

/**
 * Mixin EventEmitter
 */

inherits(Node, Emitter);

/**
 * Get or set the current state
 *
 * @param {String} state
 * @return {State}
 */

Node.prototype.state = function(state){
  if (!state) return this._state;
  if (this._state) this._state.stop();

  var State = states[state];
  this.debug('changing state to %s', State.prototype.name);
  this._state = new State(this);
  this.updateRpc();
  this._state.start();
  this.heartbeat(Date.now());

  var self = this;
  this._state.once('change', function (state) {
    self.state(state);
  });
  return this;
};

/**
 * Connect the node
 */

Node.prototype.connect = function(fn){
  var self = this;
  this.peers().forEach(function(peer){ peer.connect(); });
  this.listen(fn);
}

/**
 * Stops the node and disconnects it from the current address
 *
 * @param {Function} callback
 */

Node.prototype.stop = function(callback){
  this._state.stop();
  this.disconnect(callback);
};

/**
 * Sets up new RPC handlers for the node given its new state
 */

Node.prototype.updateRpc = function () {
  if (!this.server) return;
  this.clearHandlers();
  var rpc = this._state.rpc();
  this.handle(rpc);
  return this;
};

/**
 * Gets or sets the node's heartbeat
 */

Node.prototype.heartbeat = function (heartbeat) {
  if (arguments.length === 0) return this._heartbeat;
  this._heartbeat = heartbeat;
  return this;
};

/**
 * Return the node's log
 *
 * @return {Log} log
 */

Node.prototype.log = function(){
  return this._log;
};

/**
 * Gets or sets the port that this node is bound to
 */

Node.prototype.port = function(port){
  if (arguments.length === 0) return this._port;
  this._port = port;
  return this;
};

/**
 * Get/Set the host
 */

Node.prototype.host = function(host){
  if (arguments.length === 0) return this._host;
  this._host = host;
  return this;
}

/**
 * Friendly formatting for the node address
 */

Node.prototype.addr = function(addr){
  if (arguments.length === 0) return this.host() + ':' + this.port();

  var host = addr.split(':')[0];
  var port = parseInt(addr.split(':')[1]);
  this.host(host);
  this.port(port);
  return this;
};

/**
 * Start the node listening on `port`
 *
 * @param {Function} fn
 */

Node.prototype.listen = function(fn){
  this.debug('listening on: %s', this.addr());

  this.socket = axon.socket('rep');
  this.server = new rpc.Server(this.socket);
  var self = this;
  this.socket.bind(this.port(), function(err){
    if (err) return fn && fn(err);
    self.updateRpc();
    fn && fn();
  });
};

/**
 * Disconnects the node from whatever socket it is bound to.
 */

Node.prototype.disconnect = function(fn){
  this.debug('disconnecting');
  this.peers().forEach(function(peer){ peer.disconnect(); });
  this.socket.close(fn);
  this.socket = null;
};

/**
 * Adds a server to the node's set of peers and begins connecting to it.
 *
 * @param {String} addr
 * @return {Peer} peer
 */

Node.prototype.addPeer = function(addr){
  this.debug('adding peer %s:%s', addr);
  if (addr === this.addr()) return this.debug('ignoring adding self %s', addr);

  var peer = new Peer(addr, this);
  var added = this.peers().filter(function(client){
    return client.addr() === addr;
  });

  if (added.length) {
    this.debug('already added peer %s', addr);
    return added[0];
  }

  peer.connect();
  this._peers.push(peer);
  return peer;
};

/**
 * Return a list of the node's peers
 *
 * @return {Array} peers
 */

Node.prototype.peers = function(){
  return this._peers;
};

/**
 * Get/Set the leader
 */

Node.prototype.leader = function(leader){
  if (!leader) return this._leader;
  this._leader = leader;
  return this;
};

/**
 * Returns whether the node is a leader
 *
 * @return {Boolean}
 */

Node.prototype.isLeader = function(){
  var state = this.state();
  return state && state.name === 'leader';
};

/**
 * Get/Set the current `term`, clear the votedFor if the term is new
 */

Node.prototype.term = function(term){
  if (arguments.length === 0) return this._term;
  this._term = term;
  return this;
};

/**
 * Expose our RPC methods, can also accept an object
 *
 * @param {String} name
 * @param {Function} fn  the rpc handler
 */

Node.prototype.handle = function(name, fn){
  this.server.expose.apply(this.server, arguments);
};

/**
 * Clear the server's RPC handlers
 */

Node.prototype.clearHandlers = function(){
  this.server.methods = {};
};

/**
 * Get/set who the node voted for
 */

Node.prototype.votedFor = function(votedFor){
  if (arguments.length === 0) return this._votedFor;
  this._votedFor = votedFor;
  return this;
};

/**
 * Record a record to the state machine
 */

Node.prototype.do =
Node.prototype.record = function(command, fn){
  this._state.record(command, fn);
};

/**
 * Defaults to the state debug
 */

Node.prototype.debug = function(){
  return this.state()
    ? this.state().debug.apply(null, arguments)
    : debug.apply(null, arguments);
};

/**
 * Return the necessary size for a quorum.
 */

Node.prototype.quorum = function(){
  var members = this.peers().length + 1;
  return Math.floor(members / 2) + 1;
}