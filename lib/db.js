/**
 * lib/db.js - Module for database connection handling.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 13 Apr 15
 */

var mongoose = require('mongoose');
var Promise = require('promise');

// connect to database and define a basic error handler
mongoose.connect('mongodb://localhost/teaching')
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function (callback) {
    console.log('connected to database');
});

var saveDoc = function (doc) {
    return new Promise(function (resolve, reject) {
        doc.save(function (err, ndoc) {
            if (err) {
                if (err.code == 11000) {
                    // Doc exists; update instead.
                    var model = doc.constructor;
                    var obj = doc.toObject();
                    delete obj._id;
                    model.update({'_id': doc._id}, obj, {}, function (err, num, raw) {
                        if (err) {
                            // Unexpected database error.
                            reject(err);
                        }
                        else {
                            resolve(doc);
                        }
                    });
                }
                else {
                    // Unexpected database error.
                    reject(new Error('Database Error'));
                }
            }
            else {
                // Save succeeded.
                resolve(ndoc);
            }
        });
    });
};

module.exports = {
    mongoose: mongoose,
    saveDoc : saveDoc
};