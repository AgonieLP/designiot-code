var MongoClient = require('mongodb').MongoClient;

var url = "mongodb://localhost:27017/designiot";

function MongoPersistence() {

}

MongoPersistence.prototype.insert = function (payload) {
    'use strict';
    MongoClient.connect(url, function (err, db) {
        var insertDocuments = function (db, callback) {
            payload.date = new Date();
            var collection = db.collection("documents");
            collection.insert(payload, function (err, result) {
                callback(result);
            });
        };
        insertDocuments(db, function () {
            db.close();
        });
    });
};

MongoPersistence.prototype.update = function (payload) {
    'use strict';
    MongoClient.connect(url, function (err, db) {
        var updateDocument = function (db, callback) {
            var collection = db.collection("documents");
            collection.update({user: payload.user}, {$set: payload}, function (err, result) {
                callback();
            });
        };
        updateDocument(db, function () {
            db.close();
        });
    });
};

MongoPersistence.prototype.find = function (queryOptions, queryCB) {
    'use strict';
    MongoClient.connect(url, function (err, db) {
        var findDocuments = function (db, query, callback) {
            var collection = db.collection("documents");
            collection.find(query).toArray(function (err, docs) {
                callback(docs);
            });
        };

        findDocuments(db, queryOptions, function (result) {
            db.close();
            queryCB(result);
        });
    });
};

MongoPersistence.prototype.findOrder = function (queryOptions, order, queryCB) {
    'use strict';
    MongoClient.connect(url, function (err, db) {
        var findDocuments = function (db, query, callback) {
            var collection = db.collection("documents");
            collection.find(query).limit(1).skip(order).toArray(function (err, docs) {
                callback(docs);
            });
        };

        findDocuments(db, queryOptions, function (result) {
            db.close();
            queryCB(result);
        });
    });
};


MongoPersistence.prototype.subscribe = function (queryOptions, queryCB) {
    'use strict';
    MongoClient.connect(url, function (err, db) {
        var subDocuments = function (db, query, callback) {
            var collection = db.collection("documents");
            collection.find(query).sort({$natural: 1}).limit(1).toArray(function (err, doc) {
                callback(doc);
            });
        };

        subDocuments(db, queryOptions, function (result) {
            db.close();
            queryCB(result);
        });
    });
};

module.exports = MongoPersistence;