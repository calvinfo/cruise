var State = require('./state');

/**
 * Module `exports`
 */

var Follower = module.exports = State('follower')
  .jitter(checkPulse, 150, 300);

/**
 * Sets the timeout threshold for incoming heartbeats
 */

Follower.prototype.timeout = 500;

/**
 * Check whether this node should become a leader. If the node
 * has not received a heartbeat for over the `timeout` threshold,
 * become a candidate.
 */

function checkPulse(){
  var heartbeat = this.node.heartbeat();
  var stale = Date.now() - this.timeout > heartbeat;
  if (stale) this.emit('change', 'candidate');
}