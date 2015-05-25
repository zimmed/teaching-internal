var db = require('./db');
var fs = require('fs');
var exec = require('child_proc').exec;
var Promise = require('promise');

var Submission = db.model('Submission', db.Schema({
    user: String,
    fullPath: String,
    filePath: String,
    dirPath: String,
    isDir: Boolean,
    date: Number,
    assign: String,
    count: Number
}));

var SubLog = db.model('SubLog', db.Schema({
    date: Number,
    message: String,
    data: Object
}));

var getStats = function (assignment) {
    'use strict';

    var data = fs.readFile('./assignments.json', 'utf-8');
    data = JSON.parse(data);
    return (data[assignment]) ? data.basePath : '';
};

var addLog = function (message, obj) {
    'use strict';

    var promise = new Promise();
    var log = new SubLog({
        date: +new Date(),
        message: message,
        data: obj
    });
    return db.saveDoc(log);
};

var addSubmission = function (astats, user, assign, path, date) {
    'use strict';

    var sub, dir, promise = new Promise();
    fs.stat(path, function (stats, err) {
        if (err || !stats) {
            promise.reject(err);
            return;
        }
        Submission.count({user: user, assign: assign}, function (err, count) {
            if (err) {
                promise.reject(err);
                return;
            }
            if ((dir = stats.isDirectory()) && path.charAt(path.length - 1) === '/') {
                path = path.slice(0, -1);
            }
            sub = new Submission({
                user: user,
                fullPath: path,
                filePath: (dir) ? '' : path.substr(path.lastIndexOf('/') + 1),
                dirPath: (dir) ? dir : path.substr(0, path.lastIndexOf('/')),
                isDir: dir,
                date: date,
                assign: assign,
                count: count
            });
            if (isDir) {
                exec("sh /bin/teachingscripts/acp-r.sh '" +
                     sub.dirPath + "/*' '" +
                     astats + '/' + user + '/' + assign + '/' + count + '/', function (err, stdo, stde) {
                    if (err) {
                        promise.reject(err);
                        return;
                    }
                    db.saveDoc(sub).then(function (doc) {
                        promise.resolve(doc);
                    }, function (err) {
                        promise.reject(err);
                    });
                });
            }
        });
    });
    return promise;
};

module.exports = {
    addLog: addLog,
    addSubmission: addSubmission,
    getStats: getStats
};