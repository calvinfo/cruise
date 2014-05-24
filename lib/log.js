var range = require('range');

/**
 * `module` exports
 */

module.exports = Log;

/**
 * Create a new `Log` of entries
 *
 * @param {Node} node
 * @param {Function} apply  the function to apply to the state machine
 */

function Log(node, apply){
  this.node = node;
  this.debug = node.debug;
  this._entries = [];
  this._commitIndex = 0;
  this._lastApplied = 0;
  this._startIndex = 0;
  this._startTerm = 0;
}

/**
 * Get or set the entries for the log
 *
 * @param {Array} entries
 * @return {Array|this} entries
 */

Log.prototype.entries = function(entries){
  if (!entries) return this._entries;
  this._entries = entries;
  return this;
};

/**
 * Return the starting index for the log
 */

Log.prototype.startIndex = function(index){
  if (index === undefined) return this._startIndex;
  this._startIndex = index;
  return this;
};

/**
 * Index of the highest log entry known to be commited
 */

Log.prototype.commitIndex = function(index){
  if (index === undefined) return this._commitIndex;
  this._commitIndex = index;
  return this;
};

/**
 * Index of the highest log entry applied to the state machine
 */

Log.prototype.lastApplied = function(index){
  if (index === undefined) return this._lastApplied;
  this._lastApplied = index;
  return this;
};

/**
 * Return the current index that we're on.
 */

Log.prototype.currentIndex = function(){
  var last = this.last();
  if (!last) return this.startIndex();
  return last.index;
};

/**
 * Return the last entry in our list
 */

Log.prototype.last = function(){
  var entries = this.entries();
  var last = entries[entries.length - 1];
  if (last) return last;
  return { term: this._startTerm, index: this._startIndex };
};

/**
 * Return the first entry in our list
 */

Log.prototype.first = function(){
  var entries = this.entries();
  return entries[0];
};

/**
 * Gets an entry at a particular index
 */

Log.prototype.get = function(index){
  var startIndex = this.startIndex();
  if (index < startIndex || index > startIndex + this.size()) return;
  return this.entries()[index - this.startIndex()];
};

/**
 * Return the current size of the log
 */

Log.prototype.size = function(){
  return this.entries().length;
};

/**
 * Check whether the log already contains an entry with this index and term
 */

Log.prototype.contains = function(index, term){
  var entry = this.get(index);
  if (!entry) return false;
  return entry.term === term;
};

/**
 * Return a list of entries after the index
 */

Log.prototype.after = function(index){
  var last = this.last();
  if (!last) return [];
  if (last.index < index) return [];
  return range(index, last.index).map(this.get, this);
};

/**
 * Return a list of entries before the index
 */

Log.prototype.before = function(index){
  var start = this.startIndex();
  if (start > index) return [];
  return range(start, index).map(this.get, this);
};

/**
 * Return a range of entries
 *
 * @param {Number} start
 * @param {Number} end
 * @return {Array} entries
 */

Log.prototype.range = function(start, end){
  return range(start, end).map(this.get, this);
}

/**
 * Commit all the entries up until index
 *
 * @param {Number} index
 * @param {Function} fn
 */

Log.prototype.commit = function(index){
  var prev = this.commitIndex();
  if (index < prev) return;
  var entries = this.range(prev + 1, index + 1);
  var node = this.node;
  entries.forEach(function(entry){
    node.emit('data', entry.value);
  });
  this.commitIndex(index);
  return this;
};

/**
 * Prune all entries after `index`
 *
 * @param {Number} index
 */

Log.prototype.prune = function(index){
  var entries = this.before(index);
  this.debug('pruning %d, remaining: %j', index, entries);
  this.entries(entries);
  return this;
};

/**
 * Attempts to write the entry to the log. Returns true in the case of
 * appending or false if it was rejected.
 */

Log.prototype.append = function(entry){
  var index = entry.index;
  var term = entry.term;
  var existing = this.get(index);
  if (existing && existing.term !== term) this.prune(index);
  this.entries().push(entry);

  var first = this.first();
  this.startIndex(first.index);

  this.debug('appending: %j', entry);
  return true;
};

/**
 * Creates a new log entry
 *
 * @param {Number} term  the current term
 * @param {Number} value
 * @return {Object} entry
 */

Log.prototype.entry = function(value){
  var last = this.last();
  var index = last.index + 1;
  return {
    term: this.node.term(),
    index: index,
    value: value
  };
}