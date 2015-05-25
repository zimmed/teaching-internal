var db = require('./db');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var Promise = require('promise');

var SubmissionSchema = db.mongoose.Schema({
    user: String,
    fullPath: String,
    filePath: String,
    dirPath: String,
    isDir: Boolean,
    date: Number,
    assign: String,
    count: Number
});

var Submission = db.mongoose.model('Submission', SubmissionSchema);

var SubLogSchema = db.mongoose.Schema({
    date: Number,
    message: String,
    data: Object
});

var SubLog = db.mongoose.model('SubLog', SubLogSchema);

var getStats = function (assignment) {
    'use strict';

    var data = fs.readFileSync(__dirname + '/../assignments.json', 'utf-8'),
        json = JSON.parse(data);
    console.log(json);
    return (json[assignment]) ? data.basePath : '';
};

var getLogs = function (query) {
    query = query || {};
    return new Promise(function (resolve, reject) {
        SubLog.find(query, function (err, docs) {
            if (err) reject(err);
            else resolve(docs);
        });
    });
};

var getSubs = function (query) {
    query = query || {};
    return new Promise(function (resolve, reject) {
        Submission.find(query, function (err, docs) {
            if (err) reject(err);
            else resolve(docs);
        });
    });
}

var addLog = function (message, obj) {
    'use strict';

    var log = new SubLog({
        date: +new Date(),
        message: message,
        data: obj
    });
    return db.saveDoc(log);
};

var addSubmission = function (astats, user, assign, path, date) {
    'use strict';

    return new Promise(function (resolve, reject) {
        var sub, dir;
        fs.stat(path, function (stats, err) {
            if (err || !stats) {
                reject(err);
                return;
            }
            Submission.count({user: user, assign: assign}, function (err, count) {
                if (err) {
                    reject(err);
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
                        astats + '/' + user + '/' + assign + '/' + count + '/', function (err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        db.saveDoc(sub).then(function (doc) {
                            resolve(doc);
                        }, function (err) {
                            reject(err);
                        });
                    });
                }
            });
        });
    });
};

module.exports = {
    getLogs: getLogs,
    getSubs: getSubs,
    addLog: addLog,
    addSubmission: addSubmission,
    getStats: getStats
};
