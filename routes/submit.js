var express = require('express');
var fs = require('fs');
var moment = require('moment');
var submission = require('./lib/submission');
var router = express.Router();

router.get('/', function (req, res) {
    'use strict';
    var astats, s = '\n' + Array(32).join('-'),
        user = req.query.user,
        assign = req.query.assign,
        apath = req.query.path,
        date = +new Date();
    res.send('Submission received. Processing...\n');
    if (!user || !assign || !apath ||
        !fs.existsSync(apath) || !(astats = submission.getStats(assign))) {
        submission.addError('Bad submission request from: ' + user, req.query);
        res.send(s + '\nSubmission failed! 400: Bad Request' + s + '\n\n');
    } else {
        res.send('Saving submission (may take a minute)...\n');
        submission.addSubmission(astats, user, assign, apath, date).then(function (sub) {
            s += 'Submission for `' + sub.assign + '` Succeeded!\n';
            s += (sub.count) ? 'Re-submission #' + sub.count : 'First submission';
            s += ' : ' + moment(sub.date).format("DD MMM YY @ HH:mm") + '\n';
            s += (sub.isDir) ? 'Submitted Directory: ' : 'Submitted File: ';
            s += sub.fullpath + '\n' + Array(32).join('-') + '\n\n';
            res.send(s);
        }, function (err) {
            submission.addError('Submission failed: ' + JSON.stringify({
                    user: user,
                    assignment: assign,
                    path: apath,
                    error: err
                }));
            res.send(s + '\nSubmission failed! 500 Internal Server Error' + s + '\n\n');
        });
    }
});