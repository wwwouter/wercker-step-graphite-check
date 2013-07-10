var async = require("async");
var fs = require("fs");
var path = require("path");
var request = require('request');
var underscore = require('underscore');
var graphite = require("./graphite");

function checkMetrics(url, target, preDeployPeriod, postDeployWarmUp, diffThreshold, pipelineStarted, pipelineFinished){
  'use strict';
  var preDeployCheckEnd = pipelineStarted;
  console.log('diffThreshold ' + diffThreshold);
  console.log('pipelineFinished ' + pipelineFinished);
  console.log('postDeployWarmUp ' + postDeployWarmUp);

  // var preDeployPeriod = pipelineFinished - pipelineStarted - postDeployWarmUp;
  var postDeployCheckStart = pipelineFinished + postDeployWarmUp
  var postDeployCheckEnd = Date.now() - 5000;

  console.log('preDeployCheckEnd ' + preDeployCheckEnd);
  console.log('pipelineFinished ' + pipelineFinished);
  console.log('preDeployPeriod ' + preDeployPeriod);
  // var postDeployPeriod =  Date.now() - pipelineFinished - postDeployWarmUp;
  var preDeployCheckStart = preDeployCheckEnd - preDeployPeriod;


  // var preDeployCheckStart = null;
  // var postDeployCheckStart = null;
  // var postDeployCheckEnd = null;
  var preMeasurements = null;
  var postMeasurements = null;


  console.log('postDeployCheckEnd ' + postDeployCheckEnd);


  async.waterfall([
    function(next){


        console.log('get pre deploy measurements');
        console.log('preDeployCheckStart ' + preDeployCheckStart);
        console.log('preDeployCheckEnd ' + preDeployCheckEnd);
        console.log('preDeployPeriod ' + preDeployPeriod);
        graphite.getMeasurements(url, target, preDeployCheckStart,preDeployCheckEnd, 'raw', next );
    },
    function(measurements, next) {
        console.log('rawToAverage');
        preMeasurements = graphite.rawToAverage(measurements,true);
        console.log('preMeasurements');
        console.log(JSON.stringify(preMeasurements));

        console.log('get post deploy measurements');
        console.log('postDeployCheckStart ' + postDeployCheckStart);
        console.log('postDeployCheckEnd ' + postDeployCheckEnd);
        graphite.getMeasurements(url, target, postDeployCheckStart,postDeployCheckEnd, 'raw', next );
    },
    function(measurements, next) {
        postMeasurements = graphite.rawToAverage(measurements, false);
        console.log('postMeasurements');
        console.log(JSON.stringify(postMeasurements));
        var measurementsDiff = graphite.averagesToPercentageDiff(preMeasurements,postMeasurements);
        console.log('measurementsDiff');
        console.log(JSON.stringify(measurementsDiff));
        var warningNames = graphite.getNamesAboveThreshold(measurementsDiff, diffThreshold);
        console.log('warningNames');
        console.log(JSON.stringify(warningNames));

        if(warningNames.length === 0){
            console.log("All is ok.");
            process.exit(0);
        }

        graphite.getMeasurementsByNames(url, warningNames, preDeployCheckStart, postDeployCheckEnd, 'json', next );
    },
    function(measurements, next) {
        var imageUrl = graphite.getSummaryImageUrl(url,measurements,preDeployCheckStart, postDeployCheckEnd,target);
        console.log('imageUrl');
        console.log(imageUrl);

        var imageFilename = path.join(
          process.env["WERCKER_REPORT_DIR"],
          process.env["WERCKER_STEP_ID"],
          'image.jpg'
        );
        console.log('writing file to ' + imageFilename)

        var stream = fs.createWriteStream(imageFilename);
        request(imageUrl).pipe(stream);

        stream.on("close", function () {
          next();
        })

        stream.on("error", function(data) {
          next({error : data});
        });
    }],
    function(err) {
        if (err) {
            console.log('Error while checking metrics after deploy', err);
        }
        console.log("Something is wrong")
        process.exit(1)
    });
}




if(underscore.isUndefined(process.env["WERCKER_MAIN_PIPELINE_STARTED"])){
  console.log("WERCKER_MAIN_PIPELINE_STARTED not set");
  process.exit(1);
}
if(underscore.isUndefined(process.env["WERCKER_MAIN_PIPELINE_FINISHED"])){
  console.log("WERCKER_MAIN_PIPELINE_FINISHED not set");
  process.exit(1);
}
if(underscore.isUndefined(process.env["WERCKER_GRAPHITE_CHECK_PRE_DEPLOY_PERIOD"])){
  console.log("WERCKER_GRAPHITE_CHECK_PRE_DEPLOY_PERIOD not set");
  process.exit(1);
}
if(underscore.isUndefined(process.env["WERCKER_GRAPHITE_CHECK_POST_DEPLOY_WARMUP"])){
  console.log("WERCKER_GRAPHITE_CHECK_POST_DEPLOY_WARMUP not set");
  process.exit(1);
}
if(underscore.isUndefined(process.env["WERCKER_GRAPHITE_CHECK_URL"])){
  console.log("WERCKER_GRAPHITE_CHECK_URL not set");
  process.exit(1);
}
if(underscore.isUndefined(process.env["WERCKER_GRAPHITE_CHECK_TARGET"])){
  console.log("WERCKER_GRAPHITE_CHECK_TARGET not set");
  process.exit(1);
}
if(underscore.isUndefined(process.env["WERCKER_GRAPHITE_CHECK_DIFF_THRESHOLD"])){
  console.log("WERCKER_GRAPHITE_CHECK_DIFF_THRESHOLD not set");
  process.exit(1);
}

// var WERCKER_MAIN_PIPELINE_STARTED = "1373272448"
// var WERCKER_MAIN_PIPELINE_FINISHED = "1373272448"

// var WERCKER_GRAPHITE_CHECK_PRE_DEPLOY_PERIOD = "1373272448"
// var WERCKER_GRAPHITE_CHECK_POST_DEPLOY_WARMUP = "1373272448"

//2746597441
//1373298758

//1373298723000 plf
//1373299366287 pre deploy check end


//   preDeployCheckStart 1373385037000
//   preDeployCheckEnd 1373385337000
//   from=             1373385648
//   to                1373385360

// pre
// from=1373457094&to=1373457394

// post
// // from=1373457815&to=1373457529

// // image
// // from=1373457094&to=
// 1373457529
// 1373458000

// http://50.19.118.44/render?target=*.*.*&format=raw&from=1373286032&until=1373286332
// http://50.19.118.44/render?target=*.*.*&format=raw&
// from= 1373286032&
// until=1373286332
// http://50.19.118.44/render?target=*.*.*&format=png&from=1373458000&until=1373458060

// 1373286032 FAIL Mon, 08 Jul 2013 12:20:32 GMT
// 1373458000 OK   Wed, 10 Jul 2013 12:06:40 GMT

// //Mon, 08 Jul 2013 12:20:32 GMT
// //Mon, 08 Jul 2013 12:25:32 GMT

var pipelineFinished = parseInt(process.env["WERCKER_MAIN_PIPELINE_FINISHED"]) * 1000;
var pipelineStarted = parseInt(process.env["WERCKER_MAIN_PIPELINE_STARTED"]) * 1000;

var preDeployPeriod = parseInt(process.env["WERCKER_GRAPHITE_CHECK_PRE_DEPLOY_PERIOD"]) * 1000;
var postDeployWarmUp = parseInt(process.env["WERCKER_GRAPHITE_CHECK_POST_DEPLOY_WARMUP"]) * 1000;
var diffThreshold = parseFloat(process.env["WERCKER_GRAPHITE_CHECK_DIFF_THRESHOLD"]);


var url = process.env["WERCKER_GRAPHITE_CHECK_URL"];
var target = process.env["WERCKER_GRAPHITE_CHECK_TARGET"];

//var preDeployCheckEnd = Math.round(Date.now()/1000)- (5 * 60 * 1000);


checkMetrics(url, target, preDeployPeriod, postDeployWarmUp, diffThreshold, pipelineStarted, pipelineFinished);










