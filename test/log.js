var assert = require('assert');
var Log = require('../lib/log');

describe('Log', function () {
  describe('#get()', function () {
    it('should get indexes successfully', function () {
      var log = new Log();
      assert(log.append({ term: 1, index: 1 }));
      assert(log.get(1).term === 1);
    });
  });

  describe('#size()', function () {
    it('should reflect the entry size', function () {
      var log = new Log();
      assert(log.size() === 0);
      assert(log.append({ term: 1, index: 1 }));
      assert(log.size() === 1);
    });
  });

  describe('#commit()', function () {
    it('should commit through the specified index', function () {
      var log = new Log();
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
      var log = new Log();
      assert(log.append({ term: 1, index: 1 }));
      assert(log.append({ term: 1, index: 2 }));
      assert(log.append({ term: 2, index: 3 }));

      assert(log.size() === 3);
      assert(log.first().term === 1);
      assert(log.first().index === 1);
      assert(log.last().term === 2);
      assert(log.last().index === 3);
    });
  });

  describe('#first()', function () {
    it('should return the first entry', function () {
      var log = new Log();
      assert(log.append({ term: 4, index: 4 }));
      assert(log.first().term === 4);
      assert(log.first().index === 4);
    });

    it('should not return anything if the log is empty', function () {
      var log = new Log();
      assert(log.first() === undefined);
    });
  });

  describe('#last()', function () {
    it('should return the first entry', function () {
      var log = new Log();
      assert(log.append({ term: 4, index: 4 }));
      assert(log.append({ term: 5, index: 6 }));
      assert(log.last().term === 5);
      assert(log.last().index === 6);
    });

    it('should not return anything if the log is empty', function () {
      var log = new Log();
      assert(log.last().index === 0);
      assert(log.last().term === 0);
    });
  });
});