var Node = require('cruise-node');

var ports = [4005, 4006, 4007, 4008, 4009];
var nodes = ports.map(function(listen){
  var node = new Node()
    .state('follower');

  ports.forEach(function(port){
    if (port !== listen) node.addPeer('127.0.0.1', port)
  });
  node.listen(listen);
  return node;
});

var counter = 1;


setInterval(function () {
  var leader = getLeader();
  if (!leader) return;
  leader.state().record({ test: counter }, function (err, res){
    if (err) console.error(err);
    if (res) console.log('Recorded', counter++);
  });
}, 700);


setInterval(function () {
  console.log('------');
  nodes.forEach(function (node) {
    console.log(node.log().entries().length, node.state().name);
  });
  console.log('------');
}, 3000);


setInterval(function () {
  var leader = getLeader();
  if (!leader) return;
  leader.stop(function () {
    setTimeout(function () { leader.listen(leader.port()) }, 1000);
  });
}, 4000);


function getLeader () {
  var leaders = nodes.filter(function (node) {
    return node.state().name === 'leader';
  });
  return leaders[0];
}