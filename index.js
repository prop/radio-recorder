#!/usr/bin/env node

var dateFormat = require('dateformat');
var CronJob = require('cron').CronJob;
var fs = require('fs');

var opts = require('optimist').
    usage('Usage: $0 [options]').
    describe('h', 'Display the usage').
    alias('h', 'help').
    alias('o', 'output').
    describe('o', 'Output file').
    alias('u', 'url').
    describe('u', 'Stream URL').
    alias('l', 'duration').
    describe('l','Duration of the record in seconds. '+
             '"hh:mm:ss[.xxx]" syntax is also supported.').
    default('l', 120).
    alias('d', 'directory').
    describe('d', 'Output directory').
    boolean('D').
    alias('D', 'daemon').
    describe('D', 'Run in daemon mode').
    default('d', process.cwd()).
    alias('c', 'config').
    describe('c', 'Duration of the record in minutes').
    alias('f', 'player').
    describe('f', 'ffmpeg binary').
    default('f', 'ffmpeg');


var argv = opts.argv;


if (argv.help) {
    opts.showHelp();
    process.exit(0);
}

var FFMPEG = argv.f;

if (argv.D) {
  try {
    var config = parseConfig(argv.c);
    config.forEach(function(item){
      var cronOpts = {
        cronTime: item.when,
        onTick: function(){
          var dir = argv.d;
          if (!!item.directory) {
            dir = item.directory;
          }
          record(dir + '/' + item.name + '_' +
                 dateFormat(new Date(), 'isoDateTime') + '.mp3',
                 item.url,
                 item.duration);
        },
        start: false
      };
      
      if (!!item.timeZone) cronOpts.timeZone = item.timeZone;
      
      var job = new CronJob(cronOpts);
      job.start();
    });
  } catch (e) {
    console.error('Unable to parse config file', e);
  }
    console.log('Daemon has started');
} else {
  var fn = argv.o || argv.d + '/record-' +
    dateFormat(new Date(), 'isoDateTime') + '.mp3';
  record(fn, argv.u, argv.l);
}


function record(filename, url, duration) {
  var spawn = require('child_process').spawn,
      ffmpeg_opts = ['-i', url, '-t', duration, '-acodec',
                         'copy', filename],
      recorder  = spawn(FFMPEG, ffmpeg_opts);
  recorder.stderr.setEncoding('utf8');
  recorder.stdout.setEncoding('utf8');
  
  // recorder.stdout.on('data', function(data){
  //   console.log('stdout:', data);
  // });

  recorder.stderr.on('data', function(data){
    console.log('stderr:', data);
  });
  
  recorder.on('close', function (code, signal) {
    console.log('child process terminated due to receipt of signal ',
                signal, 'code', code);
  });
  
  // setTimeout(function(){
  //   player.kill('SIGTERM');
  // }, duration * 60 * 1000);
}


function parseConfig(fn) {
  var file = fs.readFileSync(fn, 'utf8');
  return JSON.parse(file); 
}

exports.record = record;
