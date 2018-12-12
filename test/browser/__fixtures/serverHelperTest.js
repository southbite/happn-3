/* eslint-env mocha */

Happn = require('../../..');
var expect = require('expect.js');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var server, client;
    var ServerHelper = require('./serverHelper');
    var serverHelper = new ServerHelper();

    it('starts a server', async () => {
      try {
        await serverHelper.createServer({
          port: 55001
        });
      } catch (err) {
        return Promise.reject(err);
      }
    });

    it('starts another server', async () => {
      await serverHelper.createServer({
        port: 55002
      });
    });

    it('kills both servers', async () => {
      await serverHelper.killServers();
    });
  }
);
