var State = require('./state');

/**
 * Module `exports`
 */

var Follower = module.exports = State('follower')
  .jitter(checkPulse, 300);

/**
 * Sets the timeout
 */

Follower.prototype.timeout = 300;

/**
 * Check whether this node should become a leader. If the current leader is
 * still alive, reschedule this command to be run again.
 */

function checkPulse(){
  var heartbeat = this.node.heartbeat();
  var stale = Date.now() - this.timeout > heartbeat;
  if (stale) this.emit('change', 'candidate');
}