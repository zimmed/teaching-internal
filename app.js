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
        date = +new Date();
    res.write('Submission received. Processing...\n');
    if (!user || !assign || !apath ||
        !fs.existsSync(apath) || !(astats = submission.getStats(assign))) {
        submission.addLog('Bad submission request from: ' + user, req.query);
        res.write(s + '\nSubmission failed! 400: Bad Request' + s + '\n\n');
        res.end();
    } else {
        res.write('Saving submission (may take a minute)...\n');
        submission.addSubmission(astats, user, assign, apath, date).then(function (sub) {
            s += 'Submission for `' + sub.assign + '` Succeeded!\n';
            s += (sub.count) ? 'Re-submission #' + sub.count : 'First submission';
            s += ' : ' + moment(sub.date).format("DD MMM YY @ HH:mm") + '\n';
            s += (sub.isDir) ? 'Submitted Directory: ' : 'Submitted File: ';
            s += sub.fullPath + '\n' + Array(32).join('-') + '\n\n';
            res.write(s);
            res.end();
        }, function (err) {
            console.log('Addsubmission failed.');
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
