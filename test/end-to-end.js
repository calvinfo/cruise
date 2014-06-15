var assert = require('assert');
var Cruise = require('../');
var Cluster = require('cruise-cluster')(Cruise);


describe('end to end', function(){
  this.timeout(10000);

  var cluster;
  before(function(){
    cluster = new Cluster(5);
    // randomly kill our nodes
    setInterval(function(){
      cluster.reboot(400);
    }, 500);
  });

  it('should record all writes even while killing nodes', function(done){
    var recorded = 0;
    var interval = setInterval(function(){
      cluster.do(recorded, function(err){
        recorded++;
      });
    }, 30);

    setTimeout(function(){ clearInterval(interval); }, 7500);
    setTimeout(verify, 8000);

    function verify(){
      assert(
        cluster.entries().length >= recorded,
        'expected ' + cluster.entries().length + ' to exceed ' + recorded
      );
      var committed = cluster.committed();
      var synced = cluster.synced();
      var entries = synced.map(function(node){
        return node.log().before(committed);
      });

      entries.forEach(function(node){
        entries.forEach(function(peer){
          assert.deepEqual(node, peer);
        });
      });
      done();
    }
  });

  after(function(){
    cluster.destroy();
  });
});