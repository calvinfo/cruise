
/**
 * The RPC handler for the `appendEntries`
 */

exports.appendEntries = function(req, callback){
  var node = this.node;
  var term = node.term();
  var log = node.log();
  var failure = {
    term: term,
    success: false
  };

  if (req.term < term){
    this.debug('received outdated term expected %s, got %j', term, req);
    return callback(null, failure);
  }

  if (req.term == term && node.state().name === 'candidate'){
    this.emit('change', 'follower');
  }

  if (req.term !== term) node.term(req.term);
  node.leader(req.leader);
  node.votedFor(req.leader);

  var prev = log.get(req.prevLogIndex);
  if (!prev && req.prevLogIndex) {
    this.debug('could not find a log entry for %s', req.prevLogIndex);
    return callback(null, failure);
  }

  // This gets a little weird. The leader should only append after receiving
  // successful append called from everyone else.
  if (node.state().name !== 'leader') {
    req.entries.forEach(function (entry) {
      log.append(entry);
    });
    log.commit(req.leaderCommit);
  }

  node.heartbeat(Date.now());
  this.debug('appendEntries success: %j', req.entries);
  callback(null, { term: term, success: true });
};


/**
 * RPC handler to respond to a vote request.
 */

exports.onVoteRequest = function (req, callback) {
  var node = this.node;
  var log = node.log();
  var term = node.term();
  var rejected  = { term: term, success: false };
  var granted = { term: req.term, success: true };
  var votedFor = node.votedFor();

  this.debug('received vote request %j, state: %j', req, {
    term: term,
    votedFor: votedFor
  });

  if (req.term < term) return callback(null, rejected);
  if (req.term == term && (votedFor && votedFor !== req.candidate)) {
    this.debug('already voted for another candidate: %s', votedFor);
    return callback(null, rejected);
  }

  var last = log.last();
  if (last.index > req.lastLogindex || last.term > req.lastLogTerm) {
    this.debug('refusing to vote, outdated log entry');
    return callback(null, rejected);
  }

  node.term(req.term);
  node.votedFor(req.candidate);
  callback(null, granted);
  if (node.votedFor() !== node.addr() && node.state().name !== 'follower') {
    this.emit('change', 'follower');
  }
};
