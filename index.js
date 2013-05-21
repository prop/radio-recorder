#!/usr/bin/env node

var dateFormat = require('dateformat');
var CronJob = require('cron').CronJob;
var fs = require('fs');

var opts = require('optimist').
  usage('Usage: $0 [options]').
  alias('o', 'output').
  describe('o', 'Output file').
  alias('u', 'url').
  describe('u', 'Stream URL').
  alias('l', 'duration').
  describe('l', 'Duration of the record in minutes').
  default('l', 120).
  alias('d', 'directory').
  describe('d', 'Output directory').
  boolean('D').
  alias('D', 'daemon').
  describe('D', 'Run in daemon mode').
  default('d', process.cwd()).
  alias('c', 'config').
  describe('c', 'Duration of the record in minutes').
  alias('p', 'player').
  describe('p', 'MPlayer binary').
  default('p', 'mplayer');


var argv = opts.argv;

var PLAYER = argv.p;

if (argv.D) {
  try {
    var config = parseConfig(argv.c);
    config.forEach(function(item){
      var job = new CronJob(item.when, function(){
        record(argv.d + '/' + item.name + '_' +
               dateFormat(new Date(), 'isoDateTime') + '.mp3',
               item.url,
               item.duration);
      });
      
      job.start();
    });
  } catch (e) {
    console.error('Unable to parse config file', e);
  }
} else {
  var fn = argv.o || argv.d + '/record-' +
    dateFormat(new Date(), 'isoDateTime') + '.mp3';
  record(fn, argv.u, argv.l);
}


function record(filename, url, duration) {
  var spawn = require('child_process').spawn,
  player  = spawn(PLAYER,
                  ['-playlist', url, '-dumpfile', filename, '-dumpaudio',
                   '-quiet']);

  player.on('close', function (code, signal) {
    console.log('child process terminated due to receipt of signal ',
                signal, 'code', code);
  });

  player.stdout.on('data', function (data) {
    console.log(data);
  });
  
  player.stderr.on('data', function (data) {
    console.error(data);
  });
  
  setTimeout(function(){
    player.kill('SIGTERM');
  }, duration * 60 * 1000);
}


function parseConfig(fn) {
  var file = fs.readFileSync(fn, 'utf8');
  return JSON.parse(file); 
}

exports.record = record;
