var assert = require('assert');
var axon = require('axon');
var debug = require('debug')('cruise:peer');
var Rpc = require('axon-rpc').Client;

/**
 * Module `exports`.
 */

module.exports = Peer;

/**
 * Creates a new Peer from the `addr` string
 *
 * @param {String} addr
 */

function Peer(addr){
  var host = addr.split(':')[0];
  var port = parseInt(addr.split(':')[1]);
  if (!port) port = 4001;

  this._host = host;
  this._port = port;
}

/**
 * Connects to the peer
 */

Peer.prototype.connect = function(){
  if (this.client) return;

  var socket = axon.socket('req')
    .on('error', function(err){ debug('socket is closed: %s', err); })
    .connect(this.port(), this.host());

  this.client = new Rpc(socket);
}

/**
 * Make our rpc call
 */

Peer.prototype.call = function(){
  assert(this.client);
  this.client.call.apply(this.client, arguments);
}

/**
 * Returns the port of the peer
 *
 * @return {Number} port
 */

Peer.prototype.port = function(){
  return this._port;
};

/**
 * Return this peer's host
 *
 * @return {String}
 */

Peer.prototype.host = function(){
  return this._host;
};

/**
 * Return the peer's address string
 */

Peer.prototype.addr = function(){
  return this.host() + ':' + this.port();
};