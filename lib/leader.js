var State = require('./state');

/**
 * Export the `Leader` constructor
 */

var Leader = module.exports = State('leader')
  .interval(heartbeat, 100);

/**
 * Initialize the leader state
 */

Leader.prototype.init = function(){
  // buffer queued commands for a nice callback when committed
  this.buffer = [];
  var node = this.node;
  var log = node.log();
  var peers = node.peers();
  peers.forEach(function(peer){
    peer.nextIndex(log.currentIndex());
  });
};

/**
 * Respond to any waiting requests through `index` commit in the log
 *
 * @param {Number} index
 */

Leader.prototype.respond = function(index){
  var self = this;
  this.debug('committing log %d', index);
  this.buffer.forEach(function(item){
    if (item.index > index) return;
    self.debug('calling back %d', item.index);
    item.fn();
  });
  this.buffer = this.buffer.filter(function(item){
    return item.index > index;
  });
};

/**
 * Record a value to our state machine
 *
 * @param {Object} value
 * @param {Function} callback
 */

Leader.prototype.do =
Leader.prototype.record = function(value, fn){
  fn = fn || function(){};
  var node = this.node;
  var log = node.log();
  var entry = log.entry(value);
  this.debug('adding to buffer: %j', entry);
  this.buffer.push({ index: entry.index, fn: fn });
  this.sendAppendEntries([entry]);
};

/**
 * Send an `appendEntries` request with the given `entries`
 */

Leader.prototype.sendAppendEntries = function(entries){
  var node = this.node;
  var log = node.log();
  this.debug('recording log entries: %j', entries);
  entries.forEach(function(entry){
    log.append(entry);
  });
  var self = this;
  node.peers().forEach(function(peer){
    peer.append(function(){ self.commit(); });
  });
  this.commit();
};

/**
 * Commit our next entries and callback for any waiting records
 * which haven't been responded to yet.
 */

Leader.prototype.commit = function(){
  var index = this.nextCommit();
  this.node.log().commit(index);
  this.respond(index);
}

/**
 * Determine the next commit index from what all the peers have
 * stored
 */

Leader.prototype.nextCommit = function(){
  var node = this.node;
  var log = node.log();
  var peers = node.peers();
  var indexes = peers.map(function(peer){ return peer.nextIndex(); });
  indexes.push(log.currentIndex());
  indexes.sort();
  var commit = indexes[node.quorum() - 1];
  return commit;
};

/**
 * Sends a heartbeat to each of the leader's peers, an emptyAppendEntries
 * request.
 */

function heartbeat(){
  this.sendAppendEntries([]);
}