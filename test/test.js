var states = require('cruise-states');
var Node = require('cruise-node');


var node1 = new Node()
  .state(states.Follower)
  .addPeer('127.0.0.1', 4006)
  .addPeer('127.0.0.1', 4007);

var node2 = new Node()
  .state(states.Follower)
  .addPeer('127.0.0.1', 4005)
  .addPeer('127.0.0.1', 4007);

var node3 = new Node()
  .state(states.Follower)
  .addPeer('127.0.0.1', 4005)
  .addPeer('127.0.0.1', 4006);


node1.listen(4005);
node2.listen(4006);
node3.listen(4007);