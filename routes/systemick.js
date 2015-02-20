// Routes for the systemick website client

var getItems = function (req, res, next) {
  var collectionName = req.params.collection;
  var db = req.db;

  db.collection(collectionName).find({}, {limit: 10, sort: [['weight', 1]]}).toArray(function (e, results) {
    if (e) {
      console.inf('Error retrieving items from collection ' + collectionName);
      return next(e);
    }
    if (req.query && req.query.callback) {
      res.jsonp(results);
    } else {
      res.send(results);
    }
  });
};

var getItem = function (req, res, next) {
  var collectionName = req.params.collection;
  var db = req.db;

  db.collection(collectionName).findOne({_id: req.objectID(req.params.id)}, function (e, result) {
    if (e) {
      return next(e);
    }
    res.status(200).send(result);
  });
};

var addItem = function (req, res, next) {
  var db = req.db;

  db.collection(req.params.collection).insert(req.body, {}, function (e, results) {
    if (e) {
      return next(e);
    }
    res.status(201).send(results);
  });
};

var updateItem = function (req, res, next) {
  var db = req.db;

  db.collection(req.params.collection).update({_id: req.objectID(req.params.id)}, {$set: req.body}, {safe: true, multi: false}, function (e, result) {
    if (e) {
      return next(e);
    }
    res.status((result === 1) ? 200 : 401).send((result === 1) ? {msg: 'success'} : {msg: 'error'});
  });
};

var deleteItem = function (req, res, next) {
  var db = req.db;

  db.collection(req.params.collection).remove({_id: req.objectID(req.params.id)}, function (e, result) {
    if (e) {
      return next(e);
    }
    res.status((result === 1) ? 200 : 401).send((result === 1) ? {msg: 'success'} : {msg: 'error'});
  });
};

var getContact = function (req, res, next) {
  var db = req.db;

  db.collection('contact').find({}, {limit: 10}).toArray(function (e, results) {
    if (e) {
      console.inf('Error retrieving items from collection contact');
      return next(e);
    }
    if (req.query && req.query.callback) {
      res.jsonp(results);
    } else {
      res.send(results);
    }
  });
};

var getTweetsForUser = function (req, res, next) {
  var SystemickTwitter = require('../modules/systemicktwitter');
  var st = new SystemickTwitter();

  st.getTweetsForUser(req, function (err, data) {
    if (err) {
      return next(err);
    }

    res.status(200).send(data);
  });
};

var sendContactEmail = function (req, res, next) {
  var nodemailer = require('nodemailer');
  var config = require('../config');

  var smtpTransport = nodemailer.createTransport({
    "service": config.email_service,
    "auth": {
      "user": config.email_user,
      "pass": config.email_pass
    }
  });

  var body = req.body.name + " sent an email using the contact form at " + req.body.origin + "\n\n";
  body = body + 'Email address: ' + req.body.email + "\n\n";
  body = body + req.body.message;
  var mailOptions = {
    from: "contact@systemick.co.uk",
    to: "michaelgarthwaite@gmail.com",
    subject: req.body.subject,
    text: body
  };

  console.log(mailOptions);
  smtpTransport.sendMail(mailOptions, function (error) {
    if (error) {
      console.log(error);
      return next(error);
    }

    console.log("Message sent");
    res.status(201).send();
  });

};

module.exports = function attachHandlers(app) {

  // Systemick routes
  app.get('/twitter/user/:screenName/:tweetCount', getTweetsForUser);
  app.get('/systemick/collection/:collection', getItems);
  app.post('/systemick/collection/:collection', addItem);
  app.get('/systemick/collection/:collection/:id', getItem);
  app.put('/systemick/collection/:collection/:id', updateItem);
  app.delete('/systemick/collection/:collection/:id', deleteItem);
  app.post('/systemick/contact', sendContactEmail);
};