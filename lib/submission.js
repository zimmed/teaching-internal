var db = require('./db');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var Promise = require('promise');
var moment = require('moment');

var SubmissionSchema = db.mongoose.Schema({
    user: String,
    fullPath: String,
    filePath: String,
    dirPath: String,
    isDir: Boolean,
    date: Number,
    assign: String,
    count: Number,
    late: Boolean
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
        json = JSON.parse(data),
        a = json[assignment],
        open = [];
    if (!a) return false;
    for (var prop in json) {
        if (typeof(json[prop]) === 'object' && json[prop]['cutoff']) {
            open.push(prop);
        }
    }
    return {
        path: json.basePath,
        allOpen: open,
        data: {
            due: moment(a.due, "YYYY-MM-DD HH:mm"),
            cutoff: moment(a.cutoff, "YYYY-MM-DD HH:mm"),
            name: a.name,
            token: a.token
        }
    };
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

var addSubmission = function (apath, user, assign, path, date, late) {
    'use strict';

    return new Promise(function (resolve, reject) {
        var sub, dir;
        fs.stat(path, function (err, stats) {
            if (err || !stats) {
                console.log('dberr-stat');
                console.log(err);
                reject(err);
                return;
            }
            Submission.count({user: user, assign: assign}, function (err, count) {
                if (err) {
                    console.log('dberr-count');
                    console.log(err);
                    reject(err);
                    return;
                }
                console.log('\tGot count: ' + count);
                if ((dir = stats.isDirectory()) &&
                    path.charAt(path.length - 1) === '/') {
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
                    count: count,
                    late: late
                });
                late = (late) ? 1 : 0;
                var output = apath + '/' + user + '/' + assign + '/' + count + '/';
                if (dir) {
                    console.log("acp-r.sh '" + sub.dirPath + "/*' '" +
                                output + "' " + late);
                    exec("sh /bin/teachingscripts/acp-r.sh '" +
                        sub.dirPath + "/*' '" + output + "' " + late, function (err) {
                        if (err) {
                            console.log('cproc err');
                            console.log(err);
                            reject(err);
                            return;
                        }
                        db.saveDoc(sub).then(function (doc) {
                            resolve(doc);
                        }, function (err) {
                            console.log('dberr');
                            console.log(err);
                            reject(err);
                        });
                    });
                } else {
                    console.log("acp.sh '" + sub.fullPath + "' '" +
                                output + "' " + late);
                    exec("sh /bin/teachingscripts/acp.sh '" +
                         sub.fullPath + "' '" + output + "' " + late, function (err) {
                        if (err) {
                            console.log('cproc err');
                            console.log(err);
                            reject(err);
                            return;
                        }
                        db.saveDoc(sub).then(function (doc) {
                            resolve(doc);
                        }, function (err) {
                            console.log('dberr');
                            console.log(err);
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
