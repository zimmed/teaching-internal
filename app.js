var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var fs = require('fs');
var moment = require('moment');
var submission = require('./lib/submission');

var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/submit', function (req, res) {
    'use strict';
    var astats, s = '\n' + Array(32).join('-'),
        user = req.query.user,
        assign = req.query.assign,
        apath = req.query.path,
        token = req.query.token,
        date = +new Date();
    res.write('\nSubmission received. Processing...\n');
    // Bad request fields
    if (!user || !assign || !apath) {
        submission.addLog('Bad submission request.');
        res.write(s + '\nSubmission failed! 400: Bad Request' + s + '\n\n');
        res.end();
    // Submitted file doesn't exist
    } else if (!fs.existsSync(apath)) {
        submission.addLog('Incorrect submission request from: ' + user, req.query);
        res.write(s + '\nSubmission failed! 400: Bad Request');
        res.write('\nMessage: File specified does not exist.');
        res.write('\n\tRemember, the usage is: $ submit <assignment> <path/to/work>');
        res.write('\n' + s + '\n\n');
        res.end();
    // Submitted assignment doesn't exist
    } else if (!(astats = submission.getStats(assign))) {
        submission.addLog('Incorrect submission request from: ' + user, req.query);
        res.write(s + '\nSubmission failed! 400: Bad Request');
        res.write('\nMessage: Assignment specified does not exist.');
        if (astats.allOpen && astats.allOpen.length) {
            res.write('\nAll currently open assignments:');
            res.write('\n\t' + astats.allOpen.join(', '));
        }
        res.write('\n\nRemember, the usage is: $ submit <assignment> <path/to/work>');
        res.write('\n' + s + '\n\n');
        res.end();
    // Past assignment cut-off date
    } else if (moment().diff(astats.data.cutoff, 'seconds') > 0 &&
               !(token && token === astats.data.token)) {
        submission.addLog('Too-late submission request from ' + user +
                          ' for ' + assign + '.', {});
        res.write(s + '\nSubmission failed! 400: Bad Request');
        res.write('\nMessage: You have missed the assignment cutoff date.');
        res.write('\n' + assign + ': ' + astats.data.name);
        res.write('\n\tDue: ' + astats.data.due.format('MMMM Do, h:mm a'));
        res.write('\n\tCut-off: ' + astats.data.cutoff.format('MMMM Do, h:mm a'));
        res.write('\n' + s + '\n\n');
        res.end();
    } else {
        res.write('Saving submission (may take a minute)...\n');
        var late = (moment().diff(astats.data.due) > 0);
        submission.addSubmission(
                astats.path, user, assign, apath, date, late).then(function (sub) {
            s += '\nSubmission for `' + sub.assign + '` Succeeded!\n';
            s += 'Assignment ' + sub.assign + ': ' + astats.data.name + '\n';
            s += (sub.count) ? 'Re-submission #' + sub.count : 'First submission';
            s += ' : ' + moment(sub.date).format("DD MMM YY @ HH:mm");
            if (late) s += ' (LATE!)';
            s += (sub.isDir) ? '\nSubmitted Directory: ' : '\nSubmitted File: ';
            s += sub.fullPath + '\n' + 'id: ' + sub._id + '\n';
            s += Array(32).join('-') + '\n\n';
            res.write(s);
            res.end();
        }, function (err) {
            submission.addLog('Submission failed: ' + JSON.stringify({
                    user: user,
                    assignment: assign,
                    path: apath,
                    error: err
                }));
            res.write(s + '\nSubmission failed! 500 Internal Server Error' + s + '\n\n');
            res.end();
        });
    }
});

app.get('/getlog', function (req, res) {
    submission.getLogs().then(function (data) {
        res.json(data);
    }, function (err) {
        res.json(err);
    });
});

app.get('/getassign/:assign?', function (req, res) {
    var query = (req.params.assign) ? {assign: req.params.assign} : {};
    submission.getSubs(query).then(function (data) {
        res.json(data);
    }, function (err) {
        res.json(err);
    });
});

app.use('/', index);

var server = app.listen(8090, function () {
    console.log("Server started.");
})

module.exports = app;
