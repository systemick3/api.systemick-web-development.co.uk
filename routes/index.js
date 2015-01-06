exports.getItems = function(req, res, next) {
  var collectionName = req.params.collection;
  var db = req.db;

  db.collection(collectionName).find( {},{limit:10, sort: [['weight',1]]} ).toArray(function(e, results){
    if (e) {
      console.inf('Error retrieving items from collection ' + collectionName);
      return next(e);
    }
    if (req.query && req.query.callback) {
      res.jsonp(results);
    }
    else {
      res.send(results);
    }
  });
};

exports.getItem = function(req, res, next) {
  var collectionName = req.params.collection;
  var db = req.db;

  db.collection(collectionName).findOne({_id: req.objectID(req.params.id)}, function(e, result){
    if (e) {
      return next(e);
    }
    res.status(200).send(result);
  });
};

exports.addItem = function(req, res, next) {
  var db = req.db;

  db.collection(req.params.collection).insert(req.body, {}, function(e, results){
    if (e) {
      return next(e);
    }
    res.status(201).send(results);
  });
};

exports.updateItem = function(req, res, next) {
  var db = req.db;

  db.collection(req.params.collection).update({_id: req.objectID(req.params.id)}, {$set:req.body}, {safe:true, multi:false}, function(e, result){
    if (e) {
      return next(e);
    }
    res.status((result===1) ? 200 : 401).send((result===1)?{msg:'success'}:{msg:'error'});
  });
};

exports.deleteItem = function(req, res, next) {
  var db = req.db;
  
  db.collection(req.params.collection).remove({_id: req.objectID(req.params.id)}, function(e, result){
    if (e) {
      return next(e);
    }
    res.status((result===1) ? 200 : 401).send((result===1)?{msg:'success'}:{msg:'error'});
  });
};

exports.getContact = function(req, res, next) {
  var db = req.db;

  db.collection('contact').find({},{limit:10}).toArray(function(e, results){
    if (e) {
      console.inf('Error retrieving items from collection contact');
      return next(e);
    }
    if (req.query && req.query.callback) {
      res.jsonp(results);
    }
    else {
      res.send(results);
    }
  });
}

exports.getTweetsForUser = function(req, res, next) {
  var SystemickTwitter = require('../modules/systemicktwitter');
  var st = new SystemickTwitter();

   st.getTweetsForUser(req, function(err, data) {
    if (err) {
      return next(err);
    }

    res.status(200).send(data);
  });
};

exports.sendContactEmail = function(req, res, next) {
  var nodemailer = require('nodemailer');
  var config = require('../config');

  var smtpTransport = nodemailer.createTransport({
    "service": config.email_service,
    "auth": {
      "user": config.email_user,
      "pass": config.email_pass
    }
  });

  var body = '' + req.body.name + " sent an email using the contact form at js.systemick-web-development.co.uk\n\n";
  body = body + 'Email address: ' + req.body.email + "\n\n";
  body = body + req.body.message;
  var mailOptions={
    from : "contact@systemick.co.uk",
    to : "michaelgarthwaite@gmail.com",
    subject : req.body.subject,
    text : body
  };

  console.log(mailOptions);
  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
      console.log(error);
      return next(error);
    }else{
      console.log("Message sent");
      res.status(201).send();
    }
  });

};