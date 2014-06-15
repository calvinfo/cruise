var assert = require('assert');
var Node = require('../');
var Log = Node.Log;

describe('Log', function () {
  var log;

  beforeEach(function(){
    var node = new Node('127.0.0.1:4001');
    log = new Log(node);
  });

  describe('#get()', function () {
    it('should get indexes successfully', function () {
      assert(log.append({ term: 1, index: 1 }));
      assert(log.get(1).term === 1);
    });
  });

  describe('#size()', function () {
    it('should reflect the entry size', function () {
      assert(log.size() === 0);
      assert(log.append({ term: 1, index: 1 }));
      assert(log.size() === 1);
    });
  });

  describe('#commit()', function () {
    it('should commit through the specified index', function () {
      log.store({ commit: function(){} });
      log.append({ term: 1, index: 1 });
      log.append({ term: 2, index: 2 });
      log.append({ term: 3, index: 3 });

      log.commit(2);
      assert(log.size() === 1);
    });
  });

  describe('#append()', function () {
    it('should append new entries', function () {
      assert(log.append({ term: 1, index: 1 }));
      assert(log.append({ term: 1, index: 2 }));
      assert(log.append({ term: 2, index: 3 }));

      assert(log.size() === 3);
      assert(log.first().term === 1);
      assert(log.first().index === 1);
      assert(log.last().term === 2);
      assert(log.last().index === 3);
    });

    it('should not append the same entry', function(){
      log.append({ term: 1, index: 1 });
      log.append({ term: 1, index: 1 });
      assert(log.size() === 1);
    });
  });

  describe('#first()', function () {
    it('should return the first entry', function () {
      assert(log.append({ term: 4, index: 4 }));
      assert(log.first().term === 4);
      assert(log.first().index === 4);
    });

    it('should not return anything if the log is empty', function () {
      assert(log.first() === undefined);
    });
  });

  describe('#last()', function () {
    it('should return the first entry', function () {
      assert(log.append({ term: 4, index: 4 }));
      assert(log.append({ term: 5, index: 6 }));
      assert(log.last().term === 5);
      assert(log.last().index === 6);
    });

    it('should not return anything if the log is empty', function () {
      assert(log.last().index === 0);
      assert(log.last().term === 0);
    });
  });
});