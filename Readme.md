
# cruise

  Cruise is a node implementation of the [Raft][site] consensus algorithm. It's primary use is to coordinate groups of machines within a distributed system. Cruise ensures that nodes will hold a consistent view of the cluster's replicated log.

  Raft operates in a similar manner to Paxos, but with the goal of being simpler to implement and understand. For a more complete description, it's worth checking out the original [paper][paper] by Diego Ongaro and Jon Ousterhout.

  There's also a reference implementation of a simple key value store at [`calvinfo/cruise-db`][cruise-db].


[site]: http://raftconsensus.github.io
[paper]: https://ramcloud.stanford.edu/wiki/download/attachments/11370504/raft.pdf
[cruise-db]: https://github.com/calvinfo/cruise-db

## Quickstart

  Here's how to quickly boot up a three node cluster:

```js
var Cruise = require('cruise');
var nodes = [
  new Cruise('127.0.0.1:4001'),
  new Cruise('127.0.0.1:4002'),
  new Cruise('127.0.0.1:4003')
];

/**
 * First, cluster our peers together
 */

nodes.forEach(function(node){ node.listen(); });
nodes.forEach(addPeers);

function addPeers(node){
  nodes.forEach(function(peer){
    node.addPeer(peer.addr());
  });
}

/**
 * Then begin recording values to the leader
 */

var leader = nodes.filter(function(node){
  return node.isLeader();
})[0];

leader.record('value', function(err){
  if (err) throw err;
  console.log('value recorded!');
});
```

## Client API

### new Cruise(addr)

  Creates a new cruise node with the given addr

```js
var cruise = new Cruise('127.0.0.1:4001');
```

### .state(state)

  Gets/sets the node to use `state` as it's current state. It will return a reference to the state object.

```js
var cruise = new Cruise('127.0.0.1:4001');
cruise.state().name; // 'follower'
cruise.state('leader');
cruise.state().name; // 'leader'
```

### .listen(fn)

  Sets the node to listen to accept other peer connections.

### .addPeer(addr)

  Adds a peer by it's connection string. This will de-dupe automatically and not add the node as it's own peer, but will not differentiate between different hosts/ips.

```js
var cruise = new Cruise('127.0.0.1:4001');
cruise.addPeer('127.0.0.1:4002');
```

### .record(value, fn)

  Records a value to the state machine. The callback is run once the operation has succeeded or errored.

## A simple K/V store

  As a bit more concrete example, let's take a look at implementing a toy key/value store on top of cruise. The following code demonstrates how to add cruise nodes to your application.

```js
var Cruise = require('cruise');

/**
 * Module exports
 */

module.exports = Db;

/**
 * Create a new db
 *
 * @param {String} addr
 */

function Db(addr){
  this.cruise = new Cruise(addr);
  var db = this.db = {};
  cruise.on('data', function(data){
    db[data.key] = data.val;
  });
  this.cruise.listen();
}

/**
 * Add a new peer to the datastore by the `addr` string
 * @param {String} addr  e.g. '127.0.0.1:4001'
 */

Db.prototype.peer = function(addr){
  this.cruise.addPeer(addr);
};

/**
 * Returns a value from the store
 *
 * @param {String} key
 * @return {Mixed}
 */

Db.prototype.get = function(key){
  return this.db[key];
};

/**
 * Put a value in our store. We add it only to cruise
 * and it will be automatically synced to the db when
 * consensus has been achieved.
 *
 * @param {String} key
 * @param {Mixed} val
 * @param {Function} fn
 */

Db.prototype.put = function(key, val, fn){
  if (!this.leader()) {
    return fn(new Error('must send put commands to the leader'));
  }
  var data = { key: key, val: val };
  this.cruise.record(data, fn);
};

/**
 * Return whether the current DB is the leader and can
 * @return {Boolean}
 */

Db.prototype.leader = function(){
  return this.cruise.isLeader();
};
```

  Then we put it all together:

```js
var Db = require('./db');

var addrs = [
  '127.0.0.1:4001',
  '127.0.0.1:4002',
  '127.0.0.1:4003'
];

var dbs = addrs.map(function(addr){
  var db = new Db(addr);
  addrs.forEach(function(peer){ db.peer(peer); });
  return db;
});

/**
 * Find the leader and put a value
 */

var leader = dbs.filter(function(db){ return db.isLeader(); })[0];
leader.put('foo', 'bar', function(err){

  /**
   * A majority should reflect the updated values
   */

  dbs[0].get('foo'); // 'bar'
  dbs[1].get('foo'); // 'bar'
  dbs[2].get('foo'); // 'bar'
});
```

## License

(The MIT License)

Copyright (c) 2014 Calvin French-Owen &lt;calvin@calv.info&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.