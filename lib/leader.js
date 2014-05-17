var State = require('./state');

/**
 * Export the `Leader` constructor
 */

var Leader = module.exports = State('leader')
  .interval(heartbeat, 100);

/**
 * Initialize the leader state
 */

Leader.prototype.init = function () {
  this._nextIndex = {};
  this._matchIndex = {};
  var log = this.node.log();
  var peers = this.node.peers();
  var self = this;
  peers.forEach(function(peer){
    self.nextIndex(peer, log.currentIndex());
    self.syncPeer(peer);
  });
};

/**
 * Sync a particular peer
 *
 * @param {Peer}
 */

Leader.prototype.syncPeer = function(peer){
  var node = this.node;
  var log = node.log();
  var nextIndex = this.nextIndex(peer);
  var current = log.currentIndex();
  if (this.stopped()) return;
  if (nextIndex > current) return;
  if (current == 0 || nextIndex == 0) return;

  var addr = address(peer);
  var self = this;
  var entries = log.after(nextIndex);
  var req = this.appendEntriesRequest(entries);
  this.debug('syncing %s - %d: %j', addr, nextIndex, entries);
  peer.call('appendEntries', req, function (err, res) {
    if (err) return self.syncPeer(peer);
    if (res.success) {
      self.nextIndex(peer, current);
      return self.debug('synced %s', addr);
    }
    self.nextIndex(peer, nextIndex - 1);
    self.syncPeer(peer);
  });
}

/**
 * Gets or sets the next index for the peer
 *
 * @param {Peer} peer
 * @param {Number} index
 * @return {Number} index
 */

Leader.prototype.nextIndex = function(peer, index){
  var addr = address(peer);
  if (index == null) return this._nextIndex[addr];
  this._nextIndex[addr] = index;
  return this;
};

/**
 * Record a value to our state machine
 *
 * @param {Object} value
 * @param {Function} callback
 */

Leader.prototype.record = function (value, fn) {
  var node = this.node;
  var log = node.log();
  var entry = log.entry(node.term(), value);
  this.sendAppendEntries([entry], fn);
};

/**
 * Send an `appendEntries` request with the given `entries`
 */

Leader.prototype.sendAppendEntries = function(entries, fn){
  var node = this.node;
  var log = node.log();
  var req = this.appendEntriesRequest(entries);
  var self = this;
  fn = fn || function(){};
  this.debug('recording log entry: %j', entries);
  this.quorum('appendEntries', req, function (err, success) {
    if (err) {
      self.debug('error adding %j, %s', entries, err);
      return fn(err);
    }
    if (!success) {
      self.debug('failed to add: %j', entries);
      return fn(null, success);
    }

    req.entries.forEach(function(entry){
      log.append(entry);
    });
    self.debug('added: %j', entries);
    fn(null, success);
  });
};

/**
 * Determine the next commit index from what all the peers have
 * stored
 */

Leader.prototype.nextCommit = function(){

};


/**
 * Create a new appendEntries request
 *
 * @param {Array} entries
 * @return {Object}
 */

Leader.prototype.appendEntriesRequest = function(entries){
  var node = this.node;
  var log = node.log();
  // Figure out the last entry recorded from the entries sent over
  var entry = entries[0];
  var last = entry
    ? log.get(entry.index)
    : log.last();
  if (!last) last = log.last();
  return {
    entries: entries,
    term: node.term(),
    leader: node.id(),
    prevLogIndex: last.index,
    prevLogTerm: last.term,
    leaderCommit: log.commitIndex()
  };
}

/**
 * Sends a heartbeat to each of the leader's peers, an emptyAppendEntries
 * request.
 */

function heartbeat(){
  this.sendAppendEntries([]);
}

/**
 * Utility function given a peer to combine it's hostname and port into
 * a string for identifying it
 *
 * @param {Peer}
 * @return {String}
 */

function address(peer){
  return peer.host + ':' + peer.port;
}