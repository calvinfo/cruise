var State = require('./state');
var tick = process.nextTick;

/**
 * Module `exports`
 */

var Candidate = module.exports = State('candidate');

/**
 * Initialize our Candidate
 */

Candidate.prototype.init = function () {
  var self = this;
  tick(function(){ self.requestVotes(); });
};

/**
 * Request a new election
 */

Candidate.prototype.requestVotes = function(){
  var node = this.node;
  var peers = node.peers();

  node.term(node.term() + 1);
  node.votedFor(node.addr());

  this.debug('requesting votes for term: %d...', node.term());

  var log = node.log();
  var last = log.last();
  var req = {
    term : node.term(),
    candidate : node.addr(),
    lastLogIndex : last.index,
    lastLogTerm : last.term
  };

  var self = this;
  this.quorum('voteRequest', req, function (err, res) {
    if (err) return self.debug(err);
    if (!res) return self.emit('change', 'follower');
    self.debug('promoting to leader for term: %d', node.term());
    self.emit('change', 'leader');
  });
};