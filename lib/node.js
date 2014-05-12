var axon = require('axon');
var debug = require('debug');
var rpc = require('axon-rpc');
var uid = require('hat');
var Candidate = require('./candidate');
var Follower = require('./follower');
var Leader = require('./leader');
var Log = require('./log');

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
 */

function Node(){
  if (!(this instanceof Node)) return new Node();
  this._peers = [];
  this._term = 0;
  this._log = new Log();
  this._id = uid(12, 10);
  this.heartbeat(Date.now());
  this.debug = debug('cruise:node:' + this.id());
  this.state('follower');
}

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
  this._state.once('change', function (state) { self.state(state); });
  return this;
};

/**
 * Connect the node
 */

Node.prototype.connect = function(fn){
  var self = this;
  this.peers().forEach(function(peer){ self.connectTo(peer); });
  this.listen(this.port(), fn);
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

Node.prototype.log = function () {
  return this._log;
};

/**
 * Return the node's id
 *
 * @return {String} id
 */

Node.prototype.id = function(){
  return this._id;
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

Node.prototype.addr = function(){
  return this.host() + ':' + this.port();
};

/**
 * Start the node listening on `port`
 *
 * @param {Number} port
 * @param {Function} callback
 */

Node.prototype.listen = function(host, port, callback){
  if (typeof port === 'function') {
    callback = port;
    port = null;
  }

  if (!port) {
    port = host;
    host = '127.0.0.1';
  }

  this.port(port);
  this.host(host);
  this.debug('listening on port: %s...', port);

  this.socket = axon.socket('rep');
  this.server = new rpc.Server(this.socket);
  var self = this;
  this.socket.bind(port, function (err) {
    if (err) return callback && callback(err);
    self.updateRpc();
    var peer = self.addPeer(host, port);
    self.connectTo(peer);
    callback && callback();
  });
};

/**
 * Disconnects the node from whatever socket it is bound to.
 */

Node.prototype.disconnect = function (callback) {
  this.debug('disconnecting');
  this.peers().forEach(function(peer){ peer.sock.close(); });
  this.socket.close(callback);
};

/**
 * Adds a server to the node's set of peers
 *
 * @param {String} host
 * @param {Number} port
 */

Node.prototype.addPeer = function(host, port){
  this.debug('adding peer %s:%s', host, port);

  var added = this.peers().filter(function (client) {
    return client.host === host && client.port === port;
  });

  if (added.length) {
    this.debug('already added peer %s:%s', host, port);
    return added[0];
  }

  var self = this;
  var socket = axon.socket('req');
  socket.on('error', function(err){ self.debug('socket is closed!', err); });
  var client = new rpc.Client(socket);
  client.host = host;
  client.port = port;
  this._peers.push(client);
  return client;
};

/**
 * Connect an axon rpc client to its peers
 */

Node.prototype.connectTo = function(peer){
  var sock = peer.sock;
  var host = peer.host;
  var port = peer.port;
  this.debug('connecting to %s:%s', host, port);
  sock.connect(port, host);
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

Node.prototype.votedFor = function (votedFor) {
  if (arguments.length === 0) return this._votedFor;
  this._votedFor = votedFor;
  return this;
};

/**
 * Record a record to the state machine
 */

Node.prototype.record = function(command, fn){
  this._state.record(command, fn);
};
