var underscore = require('underscore');
var request = require('request');

exports.getMeasurements = function(baseUrl, deployTargetKey, from, to, format, callback){
    'use strict';
    var fromSeconds = parseInt( from / 1000, 10);
    var toSeconds = parseInt( to / 1000, 10);
    var url = baseUrl + '/render?target=' + deployTargetKey + '&format=' + format + '&' + 'from=' + fromSeconds + '&to=' + toSeconds;

    console.log(url);

    request({
            url:url,
            method:"GET"
        }, function (err, res, body) {
            callback(err, body);
        }
    );
};

exports.getMeasurementsByNames = function(baseUrl, names, from, to, format, callback){
    'use strict';

    var fromSeconds = parseInt( from/1000, 10);
    var toSeconds = parseInt( to/1000, 10);

    var url =baseUrl + '/render?format=' + format + '&from=' + fromSeconds + '&to=' + toSeconds;

    underscore.each(names, function(name){
        url += '&target=' + name;
    });

    console.log(url);

    request({
            url:url,
            method:"GET"
        }, function (err, res, body) {
            callback(err, body);
        }
    );
};


exports.rawToAverage = function(raw, ignoreWhenAllDataPointsAreNone){
    'use strict';
    var result = {};
    if (!raw){
        return result;
    }
    try{
        var lines = raw.split('\n');
        underscore.each(lines, function(line){
            if(!!line){
                var lineData = line.split('|');
                var name = lineData[0].split(',')[0];
                var dataPoints = lineData[1].split(',');
                var allDataPointsNone = true;
                var sum = 0;

                underscore.each(dataPoints, function(dataPoint){
                    if(dataPoint !== 'None'){
                        allDataPointsNone = false;
                        sum += parseFloat(dataPoint);
                    }
                });
                if(!(allDataPointsNone && ignoreWhenAllDataPointsAreNone)){
                    var average = sum / dataPoints.length;
                    result[name] = average;
                }
            }
        });
        return result;
    }
    catch(error){
        console.log(error);
        return [];
    }
};


exports.averagesToPercentageDiff = function(preAverages, postAverages){
    'use strict';
    var result = {};

    underscore.each(preAverages, function(value, key){
        if(postAverages[key] !== undefined){
            if(preAverages[key] === postAverages[key] ){
                result[key] = 0;
            }
            else if(preAverages[key] === 0 &&  postAverages[key] === 0){
                result[key] = 0;
            }
            else if(preAverages[key] === 0 ||  postAverages[key] === 0){
                result[key] = 1;
            }
            else{
                result[key] = Math.abs(preAverages[key] - postAverages[key]) / preAverages[key];
            }
        }
    });

    return result;
};

exports.getNamesAboveThreshold = function(diffAverages, threshold){
    'use strict';
    var result = [];

    underscore.each(diffAverages, function(value, key){
        if(value > threshold){
            result.push(key);
        }
    });

    return result;

};


exports.formatJsonForStorage = function(baseUrl, measurementsJson, from, to, deployTargetKey){
    'use strict';
    var measurements = JSON.parse(measurementsJson);
    var result = [];
    var fromSeconds = parseInt( from/1000, 10);
    var toSeconds = parseInt( to/1000, 10);

    underscore.each(measurements, function(measurement){
        var item = {};
        item.title = measurement.target.replace(deployTargetKey + '.' , '');
        item.url =baseUrl + '/render?drawNullAsZero=true&lineMode=staircase&hideLegend=true&' +
            'title=' + item.title  + '&from=' + fromSeconds + '&to=' + toSeconds +'&target=' + measurement.target;

        item.datapoints = underscore.map(measurement.datapoints, function(datapoint){
            if(!datapoint[0]){
                return [0, datapoint[1]] ;
            }
            else{
                return datapoint;
            }
        });
        result.push(item);
    });

    return result;
};

exports.getSummaryImageUrl = function(baseUrl, measurementsJson, from, to, deployTargetKey){
    'use strict';
    var measurements = JSON.parse(measurementsJson);
    var result = [];
    var fromSeconds = parseInt( from/1000, 10);
    var toSeconds = parseInt( to/1000, 10);

    var url = baseUrl + '/render?drawNullAsZero=true&lineMode=staircase&hideLegend=false&' +
      'from=' + fromSeconds + '&to=' + toSeconds;

    underscore.each(measurements, function(measurement){
        url +='&target=' + measurement.target;

    });

    return url;
};