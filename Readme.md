
# cruise

  A node implementation of the Raft consensus algorithm. Raft operates in a similar manner to Paxos, but with the goal of being simpler to implement and understand.

  This is still very much a work in progress, so until I have more tests, use at your own risk.

## Quickstart

  The following shows how to boot up a three-node cruise cluster:

```js
var ports = [4005, 4006, 4007];
var node;

ports.forEach(function(port){
  node = new Node()
    .listen(port);
  addPeers(node);
});

function addPeers(node){
  ports.forEach(function(port){
    node.addPeer('127.0.0.1', port);
  });
}

node.record('value', function(err){
  if (err) throw err;
  console.log('value recorded!');
});
```

## Client API

### new Node()

  Creates a new cruise node

### .state(state)

  Sets the node to use `state` as it's current state

### .listen([host], [port], fn)

  Sets the node to listen on the `host` and `port`

### .addPeer(host, port)

  Adds a peer by host and port. Will de-dupe automatically, but not between different hosts/ips.

### .record(value, fn)

  Records a value to the state machine. The callback is run once the operation has timed out, errored, or succeeded.


## License

(The MIT License)

Copyright (c) 2013 Calvin French-Owen &lt;calvin@calv.info&gt;

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