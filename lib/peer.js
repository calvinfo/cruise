var assert = require('assert');
var axon = require('axon');
var Rpc = require('axon-rpc').Client;

/**
 * Module `exports`.
 */

module.exports = Peer;

/**
 * Creates a new Peer from the `addr` string
 *
 * @param {String} addr
 */

function Peer(addr, node){
  var host = addr.split(':')[0];
  var port = parseInt(addr.split(':')[1]);
  if (!port) port = 4001;

  this._host = host;
  this._port = port;
  this.node = node;
}

/**
 * Connects to the peer
 */

Peer.prototype.connect = function(){
  if (this.client) return this.client;

  var node = this.node;
  var socket = axon.socket('req')
    .on('error', function(err){ node.debug('peer socket is closed: %s', err); })
    .connect(this.port(), this.host());

  this.sock = socket;
  this.client = new Rpc(socket);
  return this.client;
}

/**
 * Disconnect the peer
 *
 * @param {Function} [fn]
 */

Peer.prototype.disconnect = function(fn){
  if (!this.sock) return fn && fn();
  this.sock.close(fn);
  this.sock = null;
  this.client = null;
};

/**
 * Make our rpc call
 */

Peer.prototype.call = function(){
  if (this.client) return this.client.call.apply(this.client, arguments);
  this.node.debug('peer: no client to make the call');
}

/**
 * Returns the port of the peer
 *
 * @return {Number} port
 */

Peer.prototype.port = function(){
  return this._port;
};

/**
 * Return this peer's host
 *
 * @return {String}
 */

Peer.prototype.host = function(){
  return this._host;
};

/**
 * Return the peer's address string
 */

Peer.prototype.addr = function(){
  return this.host() + ':' + this.port();
};

/**
 * Get/set the next index for data that should be sent to the peer
 *
 * @param {Number} index
 */

Peer.prototype.nextIndex = function(index){
  if (arguments.length === 0) return this._nextIndex;
  this._nextIndex = index;
  return this;
};

/**
 * Sends an appendEntries rpc to the peer. Will continually retry as long
 * as the node is leader. Since all calls are idempotent, it will keep
 * adjusting to the previous log entry that a node has.
 */

Peer.prototype.append = function(fn){
  fn = fn || function(){};
  var req = this.appendEntriesRequest();
  var node = this.node;
  var self = this;
  node.debug('%s -> appendEntries: %j', this.addr(), req);
  this.call('appendEntries', req, function (err, res){
    node.debug('%s <- appendEntries: %j', self.addr(), res);
    if (err) return fn(err);
    if (res.success) {
      var entries = req.entries;
      var last = entries[entries.length - 1];
      if (!last) return fn();
      var index = Math.max(self.nextIndex(), last.index);
      self.nextIndex(index);
      node.debug('%s set next index: %d', self.addr(), index);
      return fn();
    }
    if (res.term > node.term()) return node.emit('change', 'follower');
    if (!node.isLeader()) return fn();
    var prevIndex = Math.min(res.prevLogIndex, req.prevLogIndex - 1);
    if (prevIndex < 0) prevIndex = 0;
    node.debug('%s.nextIndex = %d', self.addr(), prevIndex);
    self.nextIndex(prevIndex);
    self.append(fn);
  });
};

/**
 * Create a new appendEntries request based upon the log of the leader
 *
 * @return {Object} req
 */

Peer.prototype.appendEntriesRequest = function(){
  var node = this.node;
  var log = node.log();
  var index = this.nextIndex();
  var entries = log.after(index + 1);
  var entry = log.get(index);
  this.node.debug('index: %d, entries: %j', index, log.entries());
  return {
    entries: entries,
    term: node.term(),
    leader: node.addr(),
    prevLogIndex: index,
    prevLogTerm: entry.term,
    leaderCommit: log.commitIndex()
  };
};