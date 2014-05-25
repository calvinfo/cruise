var Node = require('../');

var counter = 1;
var commited = {};

/**
 * Setup our servers
 */

var ports = [4005, 4006, 4007, 4008, 4009];
var nodes = ports.map(function(listen){
  var node = new Node('127.0.0.1:' + listen);
  commited[listen] = 0;
  ports.forEach(function(port){
    if (port !== listen) node.addPeer('127.0.0.1:' + port)
  });
  node.connect();
  node.on('data', function(){
    var count = commited[listen]++;
  });
  return node;
});

/**
 * Create our intervals
 */

setInterval(record, 100);
setInterval(status, 3000);
setInterval(reboot, 4000);

/**
 * Record an item to the state machine.
 */

function record(){
  var leader = nodes[Math.floor(Math.random() * nodes.length)];
  if (!leader) return;
  leader.record({ test: counter }, function (err){
    if (err) return console.error(err);
    console.log('  Recorded', counter++);
  });
}

/**
 * Log the current state of the cluster.
 */

function status(){
  console.log();

  nodes.forEach(function(node){
    console.log('  %s:%s - entries: %d',
      node.addr(),
      node.state().name,
      commited[node.port()]
    );
  });
  console.log();
}

/**
 * Reboot the leader
 */

function reboot(){
  var leader = getLeader();
  if (!leader) return;
  console.log();
  console.log('--- Killing the leader: %s ---', leader.addr());
  console.log();
  leader.stop(function(){
    setTimeout(function(){ leader.connect(); }, 1000);
  });
};

/**
 * Return the leader
 */

function getLeader(){
  var leaders = nodes.filter(function (node) {
    return node.state().name === 'leader';
  });
  return leaders[0];
}