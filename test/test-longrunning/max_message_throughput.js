describe('max_message_throughput', function () {

  var Happn = require('../../')
    , fork = require('child_process').fork
    , sep = require('path').sep
    , remotes = {}
    , async = require('async')
    ;

  GLOBAL.hrTime = function(){

    var hr = process.hrtime();

    return hr[0] * 1000000 + hr[1] / 1000;
  };

  var libFolder = __dirname + sep + 'test-resources' + sep;

  var REMOTE_CLIENT_COUNT = 4;

  var TIME = 10 * 1000;

  var NOSTORE = "true";

  var NOPUBLISH = "false";

  var SECURE_CONFIG = {
    secure: true
  };

  var NON_SECURE_CONFIG = {

  };

  var NON_SECURE_CONFIG_CONCURRENCY = {
    services:{
      queue:{
        config:{
          concurrency:8,
          outboundConcurrency:20
        }
      }
    }
  };

  var NON_SECURE_CONFIG_DIRECT = {
    services:{
      queue:{
        config:{
          mode:'direct'
        }
      }
    }
  };

  var CONFIG = NON_SECURE_CONFIG_CONCURRENCY;

  var server;

  function startHappnService(callback) {

    Happn.service.create(CONFIG)
      .then(function (_server) {
        server = _server;
        callback();
      })
      .catch(callback);
  }

  var totals = {
    tried:0,
    set:0,
    received:0
  };

  var steps;

  function logMetrics(message){

    totals.tried += message.tried;
    totals.set += message.set;
    totals.received += message.received;
  }

  function startRemoteClients(callback) {

    async.times(REMOTE_CLIENT_COUNT, function(time, timeCB){

      var remoteName = 'client ' + time.toString();

      var remote = fork(libFolder + 'max_message_throughput_client', [remoteName, NOSTORE, NOPUBLISH]);

      remote.on('message', function (message) {

        if (message.type == 'ready') {

          remotes[remoteName] = remote;
          timeCB();
        }
        if (message.type == 'starterror') {

          console.log('failed starting remote ' + remoteName + ': ', message.error);
          timeCB(new Error(message.error));
        }
        if (message.type == 'metric') {
          console.log(message);
          steps = message.steps;
          logMetrics(message)
        }
        if (message.type == 'runerror') {
          console.log(message);
        }
      });

    }, callback);

    // remote.stdout.on('data', function (data) {
    //   console.log(data.toString());
    // });
    //
    // remote.stderr.on('data', function (data) {
    //   console.log(data.toString());
    // });
  }

  function stopRemoteClients() {

    for (var remoteName in remotes) remotes[remoteName].kill();
  }

  before('start', function (done) {

    var _this = this;

    startHappnService(function (e) {

      if (e) return done(e);

      startRemoteClients(done);

    });

  });


  after(function (done) {
    stopRemoteClients();
    server.stop(done);
  });

  it("can call remote component function", function (done) {

    this.timeout(TIME + (1000 * REMOTE_CLIENT_COUNT));

    setTimeout(function(){

      console.log();

      console.log('ended, averages are: ', JSON.stringify(totals));

      console.log('set success: ' + ((totals.set / totals.tried) * 100));

      console.log('average sets per sec: ' + totals.set / (TIME / 1000));

      console.log('expected received, based on sets: ' + totals.set * REMOTE_CLIENT_COUNT);

      console.log('actual received: ' + totals.received);

      console.log('average received per sec: ' + totals.received / (TIME / 1000));

      console.log('received success, based on sets: ' + (totals.received / (totals.set * REMOTE_CLIENT_COUNT)) * 100);

      console.log();

      console.log(steps);

      var total = 0;

      // Object.keys(steps).forEach(function(step){
      //   total += steps[step];
      // });
      //
      // console.log('average total beginning->end', total);
      //
      // console.log('average total beginning->end seconds', total / 1000000);

      done();

    }, TIME);

    setInterval(function(){

      console.log('QUEUE-STATS');
      console.log(server.services.queue.stats());
      console.log('SESSION-STATS');
      console.log(server.services.session.stats());

    }, 1000);

  });

});
