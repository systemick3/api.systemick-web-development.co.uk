exports.getItems = function(req, res, next) {
  var collectionName = req.params.collection;
  var db = req.db;

  db.collection(collectionName).find({},{limit:10, sort: [['_id',-1]]}).toArray(function(e, results){
    if (e) {
      console.inf('In error');
      return next(e);
    }
    res.send(results)
  });
  console.info('collection = ' + collectionName);
};

exports.getItem = function(req, res, next) {
  var collectionName = req.params.collection;
  var db = req.db;

  db.collection(collectionName).findOne({_id: req.objectID(req.params.id)}, function(e, result){
    if (e) {
      return next(e);
    }
    res.send(result);
  });
};

exports.addItem = function(req, res, next) {
  var db = req.db;

  db.collection(req.params.collection).insert(req.body, {}, function(e, results){
    if (e) {
      return next(e);
    }
    res.send(results);
  });
};

exports.updateItem = function(req, res, next) {
  var db = req.db;

  db.collection(req.params.collection).update({_id: req.objectID(req.params.id)}, {$set:req.body}, {safe:true, multi:false}, function(e, result){
    if (e) {
      return next(e);
    }
    res.send((result===1)?{msg:'success'}:{msg:'error'});
  });
};

exports.deleteItem = function(req, res, next) {
  var db = req.db;
  
  db.collection(req.params.collection).remove({_id: req.objectID(req.params.id)}, function(e, result){
    if (e) {
      return next(e);
    }
    res.send((result===1)?{msg:'success'}:{msg:'error'});
  });
};