/* eslint-disable no-redeclare */
/*
#     CloudBoost - Core Engine that powers Bakend as a Service
#     (c) 2014 HackerBay, Inc.
#     CloudBoost may be freely distributed under the Apache 2 License
*/

var q = require("q");
var util = require("../helpers/util.js");
var _ = require('underscore');
var crypto = require('crypto');
var customHelper = require('../helpers/custom');
var type = require("../helpers/dataType");

var config = require('../config/config');
var mongoService = require('../databases/mongo');
var appService = require('./app');
var tableService = require('./table');
var winston = require('winston');

module.exports = {

    find: function(appId, collectionName, query, select, sort, limit, skip, accessList, isMasterKey, opts) {
        var deferred = q.defer();

        try {
            if (opts && opts.ignoreSchema || collectionName === "_File") {
                mongoService.document.find(appId, collectionName, query, select, sort, limit, skip, accessList, isMasterKey).then(function(doc) {
                    deferred.resolve(doc);
                }, function(err) {
                    deferred.reject(err);
                });
            } else {
                _modifyFieldsInQuery(appId, collectionName, query)
                .then(function(query) {
                    mongoService.document.find(appId, collectionName, query, select, sort, limit, skip, accessList, isMasterKey).then(function(doc) {
                        deferred.resolve(doc);
                    }, function(err) {
                        deferred.reject(err);
                    });
                }, function(error) {
                    deferred.reject(error);
                });

            }

        } catch (err) {
            winston.log('error', {
                "error": String(err),
                "stack": new Error().stack
            });
            deferred.reject(err);
        }

        return deferred.promise;
    },
    count: function(appId, collectionName, query, limit, skip, accessList, isMasterKey) {
        var deferred = q.defer();

        try {
            _modifyFieldsInQuery(appId, collectionName, query).then(function(query) {
                mongoService.document.count(appId, collectionName, query, limit, skip, accessList, isMasterKey).then(function(doc) {
                    deferred.resolve(doc);
                }, function(err) {
                    deferred.reject(err);
                });
            }, function(error) {
                deferred.reject(error);
            });
        } catch (err) {
            winston.log('error', {
                "error": String(err),
                "stack": new Error().stack
            });
            deferred.reject(err);
        }

        return deferred.promise;
    },
    distinct: function(appId, collectionName, onKey, query, select, sort, limit, skip, accessList, isMasterKey) {
        var deferred = q.defer();

        try {
            _modifyFieldsInQuery(appId, collectionName, query).then(function(query) {
                mongoService.document.distinct(appId, collectionName, onKey, query, select, sort, limit, skip, accessList, isMasterKey).then(function(doc) {
                    deferred.resolve(doc);
                }, function(err) {
                    deferred.reject(err);
                });
            }, function(error) {
                deferred.reject(error);
            });

        } catch (err) {
            winston.log('error', {
                "error": String(err),
                "stack": new Error().stack
            });
            deferred.reject(err);
        }
        return deferred.promise;
    },

    findOne: function(appId, collectionName, query, select, sort, skip, accessList, isMasterKey) {
        var deferred = q.defer();

        try {
            _modifyFieldsInQuery(appId, collectionName, query).then(function(query) {
                mongoService.document.findOne(appId, collectionName, query, select, sort, skip, accessList, isMasterKey).then(function(doc) {
                    deferred.resolve(doc);
                }, function(err) {
                    deferred.reject(err);
                });
            }, function(error) {
                deferred.reject(error);
            });

        } catch (err) {
            winston.log('error', {
                "error": String(err),
                "stack": new Error().stack
            });
            deferred.reject(err);
        }
        return deferred.promise;
    },

    save: function(appId, collectionName, document, accessList, isMasterKey, opts, encryption_key) {


        var deferred = q.defer();

        try {
            var promises = [];
            var reqType = {};
            reqType.save = [];
            reqType.update = [];
            if (document.constructor === Array) {
                for (var i = 0; i < document.length; i++) {
                    document[i] = _checkIdList(document[i], reqType);
                    _generateId(document[i], reqType);

                    promises.push(_save(appId, collectionName, document[i], accessList, isMasterKey, reqType, opts, encryption_key));
                }
                q.allSettled(promises).then(function(res) {

                    var status = true;
                    var success = [];
                    var error = [];
                    for (var i = 0; i < res.length; i++) {
                        if (res[i].status === 'fulfilled') {
                            success.push(res[i].value);
                            error.push(null);
                        } else {
                            status = false;
                            error.push(res[i].value);
                        }
                    }

                    if (status === true) {
                        deferred.resolve(success);
                    } else {
                        deferred.resolve(error);
                    }
                });
            } else {

                _save(appId, collectionName, document, accessList, isMasterKey, null, opts, encryption_key)
                .then(function(res) {
                    deferred.resolve(res);
                }, function(err) {
                    deferred.reject(err);
                });
            }

        } catch (err) {
            winston.log('error', {
                "error": String(err),
                "stack": new Error().stack
            });
            deferred.reject(err);
        }
        return deferred.promise;

    },

    delete: function(appId, collectionName, document, accessList, isMasterKey) {

        var deferred = q.defer();

        try {
            var promises = [];
            if (document.constructor === Array) {
                for (var i = 0; i < document.length; i++) {
                    promises.push(_delete(appId, collectionName, document[i], accessList, isMasterKey));
                }
                q.allSettled(promises).then(function(res) {
                    var status = true;
                    var success = [];
                    var error = [];
                    for (var i = 0; i < res.length; i++) {
                        if (res[i].status === 'fulfilled') {
                            success.push(res[i].value);
                            error.push(null);
                        } else {
                            status = false;
                            error.push(res[i].value);
                        }
                    }
                    if (status === true) {
                        deferred.resolve(success);
                    } else {
                        deferred.resolve(error);
                    }
                });
            } else {
                _delete(appId, collectionName, document, accessList, isMasterKey).then(function(res) {
                    deferred.resolve(res);
                }, function(err) {
                    deferred.reject(err);
                });
            }

        } catch (err) {
            winston.log('error', {
                "error": String(err),
                "stack": new Error().stack
            });
            deferred.reject(err);
        }
        return deferred.promise;

    },
    createIndex: function(appId, collectionName, columnName) {

        var deferred = q.defer();

        try {
            mongoService.document.createIndex(appId, collectionName, columnName).then(function(doc) {
                deferred.resolve(doc);
            }, function(error) {
                deferred.reject(error);
            });
        } catch (err) {
            winston.log('error', {
                "error": String(err),
                "stack": new Error().stack
            });
            deferred.reject(err);
        }
        return deferred.promise;
    }
};


function _save(appId, collectionName, document, accessList, isMasterKey, reqType, opts, encryption_key) {

    var deferred = q.defer();
    try {


        var docToSave = document;

        var promises = [];
        //To keep track of documents whether the document is save or update, this keeps track by id document with value
        // as "save" or "update"
        var unModDoc = [];
        /* reqType keeps track of the collections which are for save and which are for update.
         * It stores the id of collections for save in save array and update in update array*/
        if (!reqType) {

            reqType = {
                save: [],
                update: []
            };

            document = _generateId(document, reqType);
        }
        var parentId = document._id;

        document = _getModifiedDocs(document, unModDoc);
        if (document && Object.keys(document).length > 0) {
            customHelper.checkWriteAclAndUpdateVersion(appId, document, accessList, isMasterKey).then(function(listOfDocs) {
                var obj = _seperateDocs(listOfDocs);
                listOfDocs = obj.newDoc;
                obj = obj.oldDoc;

                _validateSchema(appId, listOfDocs, accessList, isMasterKey, encryption_key).then(function(listOfDocs) {
                    var mongoDocs = listOfDocs.map(function(doc){
                        return Object.assign({},doc);
                    });

                    promises.push(mongoService.document.save(appId, mongoDocs));
                    q.allSettled(promises).then(function(array) {
                        if (array[0].state === 'fulfilled') {
                            _sendNotification(appId, array[0], reqType);
                            unModDoc = _merge(parentId, array[0].value, unModDoc);


                            deferred.resolve(unModDoc);
                        } else {
                            _rollBack(appId, array, listOfDocs, obj).then(function(res) {
                                winston.log('error', res);
                                deferred.reject("Unable to Save the document at this time");
                            }, function(err) {
                                winston.log('error', err);
                                deferred.reject(err);
                            });
                        }
                    });
                }, function(err) {
                    deferred.reject(err);
                });
            }, function() {
                deferred.reject("Unauthorized to modify");
            });
        } else {


            deferred.resolve(docToSave);
        }

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        deferred.reject(err);
    }
    return deferred.promise;
}

function _delete(appId, collectionName, document, accessList, isMasterKey) {
    var deferred = q.defer();

    try {
        var promises = [];
        if (document._id) {
            customHelper.verifyWriteACLAndUpdateVersion(appId, collectionName, document, accessList, isMasterKey).then(function(doc) {
                promises.push(mongoService.document.delete(appId, collectionName, document, accessList, isMasterKey));
                if (promises.length > 0) {
                    q.allSettled(promises).then(function(res) {
                        if (res[0].state === 'fulfilled') {
                            config.realTime.sendObjectNotification(appId, document, 'deleted');
                            deferred.resolve(document);
                        } else {
                            _deleteRollback(appId, doc.oldDoc, res).then(function() {
                                deferred.reject("Unable to Delete Document Right Now Try Again !!!");
                            }, function() {
                                deferred.reject("Unable to Delete");
                            });
                        }
                    });
                }
            }, function(err) {
                winston.error(err);
                deferred.reject("You do not have permission to delete the Object");
            });
        } else {
            deferred.reject("CanNot Delete an Unsaved Object");
        }

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        deferred.reject(err);
    }
    return deferred.promise;

}

function _validateSchema(appId, listOfDocs, accessList, isMasterKey, encryption_key) {
    var deferred = q.defer();
    try {
        var promises = [];
        for (var i = 0; i < listOfDocs.length; i++)
            promises.push(_isSchemaValid(appId, listOfDocs[i]._tableName, listOfDocs[i], accessList, isMasterKey, encryption_key));
        q.all(promises).then(function(docs) {
            deferred.resolve(docs);
        }, function(err) {
            deferred.reject(err);
        });

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        deferred.reject(err);
    }
    return deferred.promise;
}

function _sendNotification(appId, res, reqType) {
    try {
        for (var i = 0; i < res.value.length; i++) {
            if (res.value[i].state === 'fulfilled') {
                if (reqType.save.indexOf(res.value[i].value._id) >= 0) {
                    config.realTime.sendObjectNotification(appId, res.value[i].value, 'created');
                } else {
                    config.realTime.sendObjectNotification(appId, res.value[i].value, 'updated');
                }
            }
        }
        return '';

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

function _isSchemaValid (appId, collectionName, document, accessList, isMasterKey, encryption_key) {
    var mainPromise = q.defer();
    var columnNotFound = false;

    try {
        var promises = [];
        if (!document) {
            mainPromise.reject('Document is undefined');
            return mainPromise.promise;
        }
        var modifiedDocuments = document._modifiedColumns;
        tableService.getSchema(appId, collectionName).then(function(table) {
            var columns = table.columns;
            //check for required.
            if (!document['_tableName'] || !document['_type']) {
                mainPromise.reject('Not a type of table');
                return mainPromise.promise;
            }
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].name === 'id')
                    continue; //ignore.

                if (document[columns[i].name] === undefined) {
                    //TODO :  check type for defaultValue , convert to date of type is DateTime , quick patch , fix properly later
                    if(columns[i].dataType === 'DateTime'){
                        try{
                            columns[i].defaultValue = new Date(columns[i].defaultValue);
                        } catch(e){
                            columns[i].defaultValue = null;
                        }
                    }
                    document[columns[i].name] = columns[i].defaultValue;
                }

                if (columns[i].dataType === 'File' && document[columns[i].name] && document[columns[i].name]._type && document[columns[i].name]._type === 'file' && !document[columns[i].name]._id) { //if url of the file is null, which means file is not saved. Remove the whole object.
                    document[columns[i].name] = null;
                }

                //if column datatype is bool, and data is  null, change data to false by default.
                if(columns[i].dataType === "Boolean" && !document[columns[i].name]){
                    document[columns[i].name] = false;
                }

                if (columns[i].required) {
                    if (document[columns[i].name] === null || document[columns[i].name] === undefined) {
                        mainPromise.reject(columns[i].name + ' is required');
                        return mainPromise.promise;
                    }
                }




                //Is Editable only by master key is true?
                if (columns[i].editableByMasterKey && modifiedDocuments.indexOf(columns[i].name) > -1) {
                    if (!isMasterKey) {
                        mainPromise.reject(columns[i].name + ' is only editable by Master Key.');
                        return mainPromise.promise;
                    }
                }
                //This code encrypts the password in the documents. It shouldn't be here in validateSchema - Let's have it here for temp.
                if (columns[i].dataType === 'EncryptedText') {
                    if (document[columns[i].name] && typeof document[columns[i].name] === 'string' && document._modifiedColumns.indexOf(columns[i].name) !== -1) {
                        document[columns[i].name] = _encrypt(document[columns[i].name], encryption_key);
                    }
                }

            }

            //check for unique.
            var query = {
                $or: []
            };

            for (let i = 0; i < columns.length; i++) {
                if (columns[i].unique && document[columns[i].name] && modifiedDocuments.indexOf(columns[i].name) >= 0) {
                    var temp = {};
                    //relation unique check.
                    if (columns[i].dataType === 'List' || columns[i].dataType === 'Object')
                        continue;
                    if (columns[i].dataType === 'Relation' && !document[columns[i].name]._id) //if relation and object is not saved.
                        continue;
                    if (columns[i].dataType === 'Relation' && document[columns[i].name]._id) { //if it is a relation and the object is saved before and has an id.
                        temp[columns[i].name + '._id'] = document[columns[i].name]._id;
                    } else if (columns[i].dataType === 'File' && document[columns[i].name]._id) { //if it is a relation and the object is saved before and has an id.
                        temp[columns[i].name + '._id'] = document[columns[i].name]._id;
                    } else {
                        temp[columns[i].name] = document[columns[i].name];
                    }
                    query.$or.push(temp);


                }
            }
            if (query.$or.length > 0) {
                var findPromise = q.defer();
                promises.push(findPromise.promise);
                mongoService.document.find(appId, collectionName, query, null, null, 9999999, 0, null, true).then(function(res) {

                    if (res.length === 1 && res[0]._id === document._id) {
                        findPromise.resolve('Update the document');
                    } else if (res.length > 0) {
                        findPromise.reject('Unique constraint violated.');
                    } else {
                        findPromise.resolve('Save the document');
                    }
                }, function(error) {
                    findPromise.reject(error);
                });
            }
            //check the schema here.
            for (var key in document) {
                if (modifiedDocuments.indexOf(key) >= 0) {
                    if (key === '_tableName' || key === '_type' || key === '_version')
                        continue; //check id; //ignore.
                    else if (key === '_id') {
                        //check if this is a string..
                        if (typeof document[key] !== 'string') {
                            mainPromise.reject('Invalid data in ID of type ' + collectionName + '. It should be of type string');
                            return mainPromise.promise;
                        }
                    } else {
                        var col = _.first(_.where(columns, {name: key})); //get the column of this key.

                        // if column does not exist create a new column
                        if (!col) {
                            columnNotFound = true;
                            try {
                                let detectedDataType = type.inferDataType(document[key]);
                                let newCol = {
                                    name: key,
                                    _type: "column",
                                    dataType: detectedDataType,
                                    defaultValue: null,
                                    editableByMasterKey: false,
                                    isDeletable: true,
                                    isEditable: true,
                                    isRenamable: false,
                                    relatedTo: type.inferRelatedToType(detectedDataType, document[key]),
                                    relationType: null,
                                    required: false,
                                    unique: false
                                };

                                //push the new column to the old schema
                                table.columns.push(newCol);

                            } catch (err) {
                                winston.log('error', {
                                    "error": String(err),
                                    "stack": new Error().stack
                                });
                                mainPromise.reject(err);
                            }

                        } else {

                            var datatype = col.dataType;
                            if (_isBasicDataType(datatype)) {
                                var res = _checkBasicDataTypes(document[key], datatype, key, collectionName); //check for basic datatypes
                                if (res.message) {
                                    mainPromise.reject(res.message);
                                    return mainPromise.promise;
                                } else {
                                    document[key] = res.data;
                                }
                            }
                            //Relation check.
                            if (document[key] && datatype === 'Relation' && typeof document[key] !== 'object') {
                                //data passed is id of the relatedObject
                                var objectId = document[key];
                                if (_validateObjectId(objectId)) {
                                    document[key] = {};
                                    document[key]._id = objectId;
                                    document[key]._tableName = col.relatedTo;
                                    document[key]._type = _getTableType(col.relatedTo);
                                    continue;
                                } else {
                                    mainPromise.reject("Invalid data in column " + key + ". It should be of type 'CloudObject' which belongs to table '" + col.relatedTo + "'");
                                    return mainPromise.promise;
                                }

                            }
                            if (document[key] && datatype === 'Relation' && typeof document[key] === 'object') {
                                if (!document[key]._tableName) {
                                    //tableName is not pasased in the object and is set explicitly
                                    document[key]._tableName = col.relatedTo;
                                }
                                if (!document[key]._id && !document[key].id) {
                                    mainPromise.reject("Invalid data in column " + key + ". It should be of type 'CloudObject' which belongs to table '" + col.relatedTo + "'");
                                    return mainPromise.promise;
                                } else {
                                    document[key]._id = document[key]._id || document[key].id;
                                    delete document[key].id;
                                }
                                if (!document[key]._type) {
                                    document[key]._type = _getTableType(col.relatedTo);
                                }
                                if (document[key]._tableName === col.relatedTo) {
                                    continue;
                                } else {
                                    mainPromise.reject("Invalid data in column " + key + ". It should be of type 'CloudObject' which belongs to table '" + col.relatedTo + "'");
                                    return mainPromise.promise;
                                }
                            }

                            /// List check
                            if (document[key] && datatype === 'List' && Object.prototype.toString.call(document[key]) !== '[object Array]') {
                                //if it is a list.
                                mainPromise.reject("Invalid data in column " + key + ". It should be of type 'CloudObject' which belongs to table '" + col.relatedTo + "'");
                                return mainPromise.promise;
                            }
                            if (document[key] && datatype === 'List' && Object.prototype.toString.call(document[key]) === '[object Array]') {
                                if (document[key].length !== 0) {
                                    if (_isBasicDataType(col.relatedTo)) {
                                        let res = _checkBasicDataTypes(document[key], col.relatedTo, key, document._tableName);
                                        if (res.message) {
                                            //if something is wrong.
                                            mainPromise.reject(res.message);
                                            return mainPromise.promise;
                                        } else {
                                            document[key] = res.data;
                                        }
                                    } else {
                                        for (let i = 0; i < document[key].length; i++) {
                                            if (document[key][i]._tableName) {
                                                if (col.relatedTo !== document[key][i]._tableName) {
                                                    mainPromise.reject('Invalid data in column ' + key + '. It should be Array of \'CloudObjects\' which belongs to table \'' + col.relatedTo + '\'.');
                                                    return mainPromise.promise;
                                                }
                                            } else {
                                                mainPromise.reject('Invalid data in column ' + key + '. It should be Array of \'CloudObjects\' which belongs to table \'' + col.relatedTo + '\'.');
                                                return mainPromise.promise;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (columnNotFound) {
                // update the table schema
                var createNewColumnPromise = q.defer();
                var schemaCursor = config.mongoClient.db(appId).collection("_Schema");
                schemaCursor.findOneAndUpdate({
                    name: document._tableName
                }, {
                    $set: table
                }, {
                    upsert: true,
                    returnOriginal: false
                }, function(err, response) {
                    var table = null;
                    if (response && response.value)
                        table = response.value;

                    if (err) {
                        createNewColumnPromise.reject("Error : Failed to update the table with the new column. ");
                    } else if (table) {
                        createNewColumnPromise.resolve();

                    }
                });

                promises.push(createNewColumnPromise.promise);
            }
            if (promises.length > 0) {
                //you have related documents or unique queries.
                q.all(promises).then(function() {
                    var obj = {};
                    obj.document = document;
                    obj.schema = columns;
                    mainPromise.resolve(obj);
                }, function(error) {
                    mainPromise.reject(error);
                });
            } else {
                var obj = {};
                obj.document = document;
                obj.schema = columns;
                mainPromise.resolve(obj); //resolve this promise.
            }
        }, function(error) {
            mainPromise.reject(error);
        });

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        mainPromise.reject(err);
    }

    return mainPromise.promise;

}

function _validateObjectId(objectId) {
    if (objectId.length === 8)
        return true;
    return false;
}

function _getTableType(tableName) {
    var tableType = "custom";
    if (tableName === "User") {
        tableType = "user";
    } else if (tableName === "Role") {
        tableType = "role";
    } else if (tableName === "Device") {
        tableType = "device";
    } else if (tableName === "_File") {
        tableType = "file";
    } else if (tableName === "_Event") {
        tableType = "event";
    } else if (tableName === "_Funnel") {
        tableType = "funnel";
    }
    return tableType;
}

function _checkBasicDataTypes(data, datatype, columnName, tableName) {

    try {
        if (Object.prototype.toString.call(data) === '[object Array]') {
            for (var i = 0; i < data.length; i++) {

                var res = _checkDataTypeUtil(data[i], datatype, columnName, tableName);

                if (!res.message) {
                    data[i] = res.data;
                } else {
                    return res;
                }
            }
        } else {
            return _checkDataTypeUtil(data, datatype, columnName, tableName);
        }
        var obj = {};
        obj.data = data;
        obj.message = null;

        return obj; //success!

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

function _checkDataTypeUtil(data, datatype, columnName, tableName) {

    try {
        var obj = {};
        obj.data = data;
        obj.message = null;
        var isValid = true;

        if (data && datatype === 'Number' && typeof data !== 'number') {
            isValid = false;
        }

        if (data && datatype === 'Text' && typeof data !== 'string') {
            isValid = false;
        }

        if (data && datatype === 'EncryptedText' && typeof data !== 'string') {
            isValid = false;
        }

        if (data && datatype === 'Email' && typeof data !== 'string') {
            isValid = false;
        }

        if (data && datatype === 'Email' && typeof data === 'string' && !util.isEmailValid(data)) {
            isValid = false;
        }

        if (data && datatype === 'URL' && typeof data !== 'string') {
            isValid = false;
        }

        if (data && datatype === 'URL' && typeof data === 'string' && !util.isUrlValid(data)) {
            isValid = false;
        }

        if (data && datatype === 'EncryptedText' && typeof data !== 'string') {
            isValid = false;
        }

        if (data && datatype === 'Boolean' && typeof data !== 'boolean') {
            isValid = false;
        }

        if (data && datatype === 'DateTime' && new Date(data).toString() === 'Invalid Date') {
            isValid = false;
        } else {
            if (data && datatype === 'DateTime' && typeof data === "string") {
                obj.data = new Date(data);
            }
        }

        if (data && datatype === 'ACL' && typeof data !== 'object' && data.read && data.write) {
            isValid = false;
        }

        if (data && datatype === 'Object' && typeof data !== 'object') {
            isValid = false;
        }

        if (data && datatype === 'GeoPoint' && data._type !== 'point') {
            isValid = false;
        }

        if (data && datatype === 'GeoPoint' && data._type === 'point') {
            if ((Number(data.latitude) <= -90 || Number(data.latitude) >= 90) || (Number(data.longitude) <= -180 && Number(data.longitude) >= 180)) {
                isValid = false;
            }
        }

        if (data && datatype === 'File' && (data._type && data._type !== 'file')) {
            isValid = false;
        }

        if (!isValid) {
            obj.message = 'Invalid data in column ' + columnName + ' of table ' + tableName + '. It should be of type ' + datatype;
        }

        return obj; //success!

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

function _isBasicDataType(dataType) {
    try {

        var types = [
            'Object',
            'ACL',
            'DateTime',
            'Boolean',
            'EncryptedText',
            'URL',
            'Email',
            'Text',
            'File',
            'Number',
            'GeoPoint'
        ];

        if (types.indexOf(dataType) > -1) {
            return true;
        }

        return false;

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
    }
}

function _generateId(document, reqType) {

    try {
        if (document._type) {
            if (!document._id) {
                var id;
                if (document._hash) {
                    id = document._hash;
                    delete document._hash;
                } else
                    id = util.getId();
                document._id = id;
                reqType.save.push(id);
            } else {
                reqType.update.push(document._id);
            }
        }
        for (var key in document) {
            if (document[key]) {
                if (document[key].constructor === Array && document[key].length) {
                    for (var i = 0; i < document[key].length; i++) {
                        if (document[key][i]._tableName) {
                            _generateId(document[key][i], reqType);
                        }
                    }
                }
                if (typeof document[key] === 'object' && document[key] != null) {
                    if (document[key]._type) {
                        _generateId(document[key], reqType);
                    }
                }
            }
        }
        return document;

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

function _getModifiedDocs(document, unModDoc) {

    try {
        var modifiedDocument = [];
        /* check for isModified with id so as to ensure that if document is modified or it is created
            as a newly created document will have isModified as false*/
        var doc = {};
        if (document._isModified) {
            var modifiedColumns = document._modifiedColumns;

            if (!document.createdAt) {
                document.createdAt = new Date();
                if (modifiedColumns.indexOf('createdAt') === -1)
                    modifiedColumns.push('createdAt');
                }
            if (!document.expires) {
                document.expires = null;
                if (modifiedColumns.indexOf('expires') === -1)
                    modifiedColumns.push('expires');
                }
            document.updatedAt = new Date();
            if (modifiedColumns.indexOf('updatedAt') === -1) {
                modifiedColumns.push('updatedAt');
            }
            modifiedColumns.push('_version');

            doc = {};

            for (var key in document) {
                //Push in the basic fields as they are not there in Modified Array
                if (key === '_id' || key === '_type' || key === '_tableName' || key === '_isModified' || key === '_modifiedColumns') {
                    doc[key] = document[key];
                    // Check if it is a List of Relation's if yes then just have the basic parameter's not all
                } else if (modifiedColumns.indexOf(key) >= 0) {
                    if (document[key] !== null && document[key].constructor === Array && document[key].length > 0) {
                        if (document[key][0]._type && document[key][0]._tableName) {
                            var subDoc = [];

                            //get the unique objects
                            document[key] = _getUniqueObjects(document[key]);

                            for (var i = 0; i < document[key].length; i++) {
                                var temp = {};
                                temp._type = document[key][i]._type;
                                temp._tableName = document[key][i]._tableName;
                                temp._id = document[key][i]._id;
                                subDoc.push(temp);
                            }
                            doc[key] = subDoc;
                        } else if (document[key][0]._type && document[key][0]._type === 'file') {
                            var subDoc = [];
                            for (var i = 0; i < document[key].length; i++) {
                                var temp = {};
                                temp._type = document[key][i]._type;
                                temp._id = document[key][i]._id;
                                subDoc.push(temp);
                            }
                            doc[key] = subDoc;
                        } else {
                            doc[key] = document[key];
                        }
                    } else if (document[key] !== null && document[key].constructor === Object) {
                        if (document[key]._type && document[key]._tableName) {
                            var subDoc = {};
                            subDoc._type = document[key]._type;
                            subDoc._tableName = document[key]._tableName;
                            subDoc._id = document[key]._id;
                            doc[key] = subDoc;
                        } else if (document[key]._type && document[key]._type === 'file') {
                            var subDoc = {};
                            subDoc._type = document[key]._type;
                            subDoc._id = document[key]._id;
                            doc[key] = subDoc;
                        } else {
                            doc[key] = document[key];
                        }
                    } else {
                        doc[key] = document[key];
                    }
                }
            }

            delete document._modifiedColumns;
            document._isModified = false;

        } else {

            var unDoc = _stripChildDocs(document);
            unModDoc.push(unDoc);

            delete document._modifiedColumns;
            document._isModified = false;
        }
        if (doc) {
            if (Object.keys(doc).length > 0)
                modifiedDocument.push(doc);
            }
        for (var key in document) {
            if (document[key]) {
                if (document[key].constructor === Array && document[key].length > 0) {

                    for (var i = 0; i < document[key].length; i++) {
                        if (document[key][i]._type && document[key][i]._type !== "point") { //geopoint has no modified array, so we skip passing that to the function.
                            var subDoc = _getModifiedDocs(document[key][i], unModDoc);
                            //concat, as the there can be subDocuments to subDocuments
                            if (subDoc.length !== 0)
                                modifiedDocument = modifiedDocument.concat(subDoc);
                            }
                        }

                }
                if (typeof document[key] === 'object' && document[key] != null) {
                    if (document[key]._type && document[key]._type !== "point") { //geopoint has no modified array, so we skip passing that to the function.
                        var subDoc = _getModifiedDocs(document[key], unModDoc);
                        if (subDoc.length !== 0)
                            modifiedDocument = modifiedDocument.concat(subDoc);
                        }
                    }
            }
        }
        return modifiedDocument;

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

/*this function checks returns a document with all its sub-documents removed from it. In case of sub-documents
it leaves the basic values like id, tableName and type*/
function _stripChildDocs(document) {
    try {
        var doc = {};
        for (var key in document) {
            if (document[key] !== null && document[key].constructor === Array && document[key].length > 0) {
                if (document[key][0]._type && document[key][0]._tableName) {
                    var subDoc = [];
                    for (var i = 0; i < document[key].length; i++) {
                        var temp = {};
                        temp._type = document[key][i]._type;
                        temp._tableName = document[key][i]._tableName;
                        temp._id = document[key][i]._id;
                        subDoc.push(temp);
                    }
                    doc[key] = subDoc;
                } else {
                    doc[key] = document[key];
                }
            } else if (document[key] !== null && document[key].constructor === Object) {
                if (document[key]._type && document[key]._tableName) {
                    var subDoc = {};
                    subDoc._type = document[key]._type;
                    subDoc._tableName = document[key]._tableName;
                    subDoc._id = document[key]._id;
                    doc[key] = subDoc;
                } else {
                    doc[key] = document[key];
                }
            } else {
                doc[key] = document[key];
            }
        }
        return doc;

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

function _deleteRollback(appId, document, res) {
    var deferred = q.defer();

    try {
        var promises = [];
        _getSchema(appId, document._tableName).then(function(schema) {
            var docToSave = {};
            docToSave.document = document;
            docToSave.schema = schema;
            document = [];
            document.push(docToSave);

            if (res[0].state === 'fulfilled') {
                promises.push(mongoService.document.save(appId, document));
            }
            if (promises.length > 0) {
                q.all(promises).then(function() {
                    deferred.resolve("Success");
                }, function(err) {
                    deferred.reject(err);
                });
            }
        }, function() {
            deferred.reject();
        });

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        deferred.reject(err);
    }
    return deferred.promise;
}

function _merge(collectionId, listOfDocs, unModDoc) {
    try {
        var document = {};
        for (var i = 0; i < listOfDocs.length; i++) {
            if (listOfDocs[i].value)
                if (listOfDocs[i].value._id === collectionId) {
                    document = listOfDocs[i].value;
                    break;
                }
            }
        if (Object.keys(document).length === 0) {
            for (var i = 0; i < unModDoc.length; i++) {
                if (unModDoc[i])
                    if (unModDoc[i]._id === collectionId) {
                        document = unModDoc[i];
                        break;
                    }
                }
        }
        for (var key in document) {
            if (document[key]) {
                if (document[key] !== null && document[key].constructor === Array && document[key].length > 0) {
                    if (document[key][0]._type) {
                        for (var i = 0; i < document[key].length; i++) {
                            for (var k = 0; k < listOfDocs.length; k++) {
                                if (listOfDocs[k].value)
                                    if (listOfDocs[k].value._id === document[key][i]._id) {
                                        document[key][i] = _merge(listOfDocs[k].value._id, listOfDocs, unModDoc);
                                    }
                                }
                            for (var k = 0; k < unModDoc.length; k++) {
                                if (unModDoc[k])
                                    if (unModDoc[k]._id === document[key][i]._id)
                                        document[key][i] = _merge(unModDoc[k]._id, listOfDocs, unModDoc);
                                    }
                                }
                    }
                } else if (document[key] !== null && document[key].constructor === Object) {
                    if (document[key]._type) {
                        for (var k = 0; k < listOfDocs.length; k++) {
                            if (listOfDocs[k].value)
                                if (listOfDocs[k].value._id === document[key]._id)
                                    document[key] = listOfDocs[k].value;
                                }
                            for (var k = 0; k < unModDoc.length; k++) {
                            if (unModDoc[k])
                                if (unModDoc[k]._id === document[key]._id)
                                    document[key] = unModDoc[k];
                                }
                            }
                }
            }
        }
        return document;

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

//this function gets the schema of the table from the db.
function _getSchema(appId, collectionName) {

    var deferred = q.defer();

    try {
        tableService.getSchema(appId, collectionName).then(function(table) {
            deferred.resolve(table.columns);
        }, function(error) {
            deferred.reject(error);
        });

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        deferred.reject(err);
    }

    return deferred.promise;
}

//this function modifies the fields ['password','datetime']  passed in the Query.
function _modifyFieldsInQuery(appId, collectionName, query) {

    var deferred = q.defer();

    try {
        if (collectionName === '_File') {
            deferred.resolve(query);
        } else {
            _getSchema(appId, collectionName).then(function(columns) {
                var passwordColumnNames = [];
                var dateTimeColumnNames = [];

                // push in fields to be modified / i.e DateTime and Encypted fields
                for (var i = 0; i < columns.length; i++) {
                    if (columns[i].dataType === 'EncryptedText') {
                        passwordColumnNames.push(columns[i].name);
                    }
                    if (columns[i].dataType === 'DateTime') {
                        dateTimeColumnNames.push(columns[i].name);
                    }
                }

                //resolve if there are no password fields or DateTime fields
                if (passwordColumnNames.length === 0 && dateTimeColumnNames === 0) {
                    deferred.resolve(query);
                } else {
                    appService.getApp(appId).then(function (application) {
                        //or modify the query and resolve it.
                        if (passwordColumnNames.length)
                            query = _recursiveModifyQuery(query, passwordColumnNames, 'encrypt',application.keys.encryption_key);
                        if (dateTimeColumnNames.length)
                            query = _recursiveModifyQuery(query, dateTimeColumnNames, 'datetime',application.keys.encryption_key);
                        deferred.resolve(query);
                    }), function(){
                        deferred.reject("Cannot find an app wiht AppID "+appId);
                    };
                }
            }, function(error) {
                deferred.reject(error);
            });
        }
    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        deferred.reject(err);
    }

    return deferred.promise;
}

function _encrypt(data, encryption_key) {
    try {
        var cipher_alg = 'aes-256-ctr';
        if(encryption_key && encryption_key.iv && encryption_key.key){
            // to decrypt text use this
            // var encryptedText = encryptText(cipher_alg, encryption_key.key, encryption_key.iv, data);
            //
            return encryptText(cipher_alg, encryption_key.key, encryption_key.iv, data);
        } else {
            return crypto.pbkdf2Sync(data, config.secureKey, 10000, 64, 'sha1').toString('base64');
        }
    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

function _recursiveModifyQuery(query, columnNames, type, encryptionKey) {




    for (var key in query) {
        if (key === '$or') {
            for (var i = 0; i < query[key].length; i++) {
                query[key][i] = _recursiveModifyQuery(query[key][i], columnNames, type, encryptionKey);
            }
        }
    }
    return _.mapObject(query, function(val, key) {
        if (columnNames.indexOf(key) > -1) {
            if (typeof val !== 'object') {
                if (type === 'encrypt') {
                    return _encrypt(val, encryptionKey);
                }
            } else {
                // for datetime fields convert them to a fomat which mongodb can query
                if (type === 'datetime') {
                    try {
                        Object.keys(val).map(function(x) {
                            val[x] = new Date(val[x]);
                        });
                        return val;
                    } catch (e) {
                        return val;
                    }
                }
            }
        }
        return val;
    });
}

function _attachSchema(docsArray, oldDocs) {
    try {
        for (var i = 0; i < oldDocs.length; i++) {
            for (var j = 0; j < docsArray.length; j++) {
                if (oldDocs[i]._id === docsArray[j].document._id) {
                    var obj = {};
                    obj.document = oldDocs[i];
                    obj.schema = docsArray[j].schema;
                    oldDocs[i] = obj;
                }
            }
        }
        return oldDocs;
    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

function _rollBack(appId, status, docsArray, oldDocs) {
    var deferred = q.defer();

    try {
        oldDocs = _attachSchema(docsArray, oldDocs);
        var promises = [];
        var arr = [];
        if (status[0].state === 'fulfilled') {
            if (oldDocs)
                promises.push(mongoService.document.save(appId, oldDocs));
            else {
                for (var i = 0; i < docsArray.length; i++) {
                    promises.push(mongoService.delete(appId, docsArray[i]._tableName, docsArray[i]));
                }
            }
            arr.push('Mongo');
        }

        q.allSettled(promises).then(function(res) {
            var status = true;
            for (var i = 0; i < res.length; i++) {
                if (res[i].state !== 'fulfilled') {
                    status = false;
                    deferred.reject();
                    break;
                }
            }
            if (status === true) {
                deferred.resolve();
            }
        });

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        deferred.reject(err);
    }
    return deferred.promise;
}

function _seperateDocs(listOfDocs) {
    try {
        var newDoc = [];
        var oldDoc = [];
        for (var i = 0; i < listOfDocs.length; i++) {
            if (listOfDocs[i].oldDoc) {
                oldDoc.push(listOfDocs[i].oldDoc);
            }
            newDoc.push(listOfDocs[i].newDoc);
        }
        var obj = {};
        obj.newDoc = newDoc;
        obj.oldDoc = oldDoc;
        return obj;

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

function _checkIdList(document, reqType) {
    try {
        var idList = reqType.save;
        idList = idList.concat(reqType.update);
        if (idList.indexOf(document._id) !== -1 || idList.indexOf(document._hash) !== -1) {
            if (document._isModified) {
                delete document._isModified;
                delete document._modifiedColumns;
            }
        } else {
            for (var key in document) {
                if (document[key]) {
                    if (document[key].constructor === Array && document[key].length) {
                        if (document[key][0]._tableName) {
                            for (var i = 0; i < document[key].length; i++)
                                document[key][i] = _checkIdList(document[key][i], reqType);
                            }
                        }
                    if (typeof document[key] === 'object' && document[key] != null) {
                        if (document[key]._type) {
                            document[key] = _checkIdList(document[key], reqType);
                        }
                    }
                }
            }
        }
        return document;

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return null;
    }
}

/*Desc   : Filter and return unique objects
  Params : objectsList
  Returns: uniqueListObject
*/
function _getUniqueObjects(objectsList) {

    var uniqueListIds = [];
    var uniqueListObject = [];

    try {
        if (objectsList && objectsList.length > 0) {
            for (var i = 0; i < objectsList.length; ++i) {
                if (uniqueListIds.indexOf(objectsList[i]._id) < 0) {
                    uniqueListIds.push(objectsList[i]._id);
                    uniqueListObject.push(objectsList[i]);
                }
            }
        } else {
            uniqueListObject = objectsList;
        }

        return uniqueListObject;

    } catch (err) {
        winston.log('error', {
            "error": String(err),
            "stack": new Error().stack
        });
        return uniqueListObject;
    }
}

//to encrypt data
function encryptText(cipher_alg, key, iv, text) {
			var cipher = crypto.createCipheriv(cipher_alg, key.toString('hex').slice(0, 32), iv.toString('hex').slice(0, 16));
			var result = cipher.update(text, "utf8", 'hex');
			result += cipher.final('hex');
			return result;
}

//to decrypt data
//eslint-disable-next-line
function decryptText(cipher_alg, key, iv, text) {
			var decipher = crypto.createDecipheriv(cipher_alg, key.toString('hex').slice(0, 32), iv.toString('hex').slice(0, 16));
			var result = decipher.update(text, 'hex');
			result += decipher.final();
			return result;
}