var http = require('http'),
  path = require('path'),
  fs = require('fs'),
  express = require('express'),
  mongoskin = require('mongoskin'),
  bodyParser = require('body-parser'),
  morgan = require('morgan'),
  routes = require('./routes'),
  user = require('./routes/tweetapp/user'),
  tweetapp = require('./routes/tweetapp'),
  config = require('./config'),
  expressJwt = require('express-jwt'),
  jwt = require('jsonwebtoken'),
  session = require('express-session'),
  app = express();

app.set('port', process.env.PORT || config.port || 3000);
app.set('env', process.env.NODE_ENV || config.env || 'development');
app.set("jsonp callback", true);

/////////////////////////// DATABASE CONNECTIONS /////////////////////////////////

var dbUrl = process.env.MONGOHQ_URL ||  config.mongo;
if (!dbUrl) {
  throw new Error('Missing url for mongodb');
}
var db = mongoskin.db(dbUrl, { native_parser:true });
var ObjectID = mongoskin.ObjectID;

var twitterCache = {};
var tweetappDbUrl = config.tweetapp.dbUrl;
var tweetappDb = mongoskin.db(tweetappDbUrl, { native_parser:true });

///////////////////////////////////////////////////////////////////////////////////

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({secret: config.sessionSalt}));

// Development error handler
// Will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
  });
}

// Production error handler
// No stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Logging print to both the console and a logfile
// Use morgan for logging errors
var logfile = fs.createWriteStream('./logs/access.log', { flags: 'a' });
app.use(morgan("combined", {stream: logfile}));
app.use(morgan("dev"));
var errorLogger = require('./utils/errorLogger');

app.use(function(req,res,next){
  req.db = db;
  req.objectID = ObjectID;
  req.twitterCache = twitterCache;
  req.tweetappDb = tweetappDb;
  req.jwt = jwt;
  next();
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

// The routes below require authentication
//app.use('/tweetapp/auth', expressJwt({ secret: config.cookieSalt }));

//////////////////////////////// ROUTES /////////////////////////////////////

// Default routes
// app.get('/', function(req, res, next) {
//   res.send('please select a collection, e.g., /api/skills');
// });
app.get('/api', function(req, res, next) {
  res.send('please select a collection, e.g., /api/skills');
});
app.get('/twitter', function(req, res, next) {
  res.send('please select a collection, e.g., /api/skills');
});

// Tweetapp routes
app.get('/tweetapp/test', user.testUser);
//app.post('/tweetapp/login', user.login);
app.post('/tweetapp/login/twitter', user.twitterLogin);
app.get('/tweetapp/login/twitter/callback', user.twitterLoginCallback);
app.get('/tweetapp/auth/session', user.sessionData);
app.get('/tweetapp/auth/user/:user_id', user.userData);

app.get('/tweetapp/auth/tweet/user/:screenName/:tweetCount', tweetapp.getTweetsForUser);
app.get('/tweetapp/auth/tweet/user/:screenName/:tweetCount/:maxId', tweetapp.getTweetsForUser);
app.get('/tweetapp/auth/tweet/one/:id', tweetapp.getTweet);

app.get('/tweetapp/auth/analysis/user/:userId', tweetapp.getUserAnalysis);
app.get('/tweetapp/auth/analysis/chart/:userId', tweetapp.getUserAnalyses);
app.get('/tweetapp/auth/analysis/tweet/:tweetId', tweetapp.getTweetAnalysis);

app.get('/tweetapp/auth/tweet/retweeters/:tweetId', tweetapp.getRetweeters);
app.get('/tweetapp/auth/tweet/mentions/:userId', tweetapp.getUserMentions);
app.get('/tweetapp/auth/tweet/replies/:userId/:tweetId', tweetapp.getReplies);
app.get('/tweetapp/auth/tweet/trends', tweetapp.getTrends);
app.get('/tweetapp/auth/tweet/sentiment/:tweetId', tweetapp.getSentiment);
app.get('/tweetapp/auth/tweet/sentiment/:tweetId/:isReply', tweetapp.getSentiment);


// app.get('/tweetapp/auth/stream', tweetapp.getStream);

// Systemick routes
app.get('/twitter/user/:screenName/:tweetCount', routes.getTweetsForUser);
app.get('/systemick/collection/:collection', routes.getItems);
app.post('/systemick/collection/:collection', routes.addItem);
app.get('/systemick/collection/:collection/:id', routes.getItem);
app.put('/systemick/collection/:collection/:id', routes.updateItem);
app.delete('/systemick/collection/:collection/:id', routes.deleteItem);
app.post('/systemick/contact', routes.sendContactEmail);

// Fallback to 404 if route not found
app.get('*', function(req, res){
  res.sendStatus(404);
  res.end('Page not found');
});

//////////////////////////////////////////////////////////////////////////////

// Create server
var server = http.createServer(app);

var boot = function () {
  var s = server.listen(app.get('port'), function(){
    console.info('Express server listening on port ' + app.get('port'));
    console.info('Current environment is ' + app.get('env'));
  });
};
var shutdown = function() {
  server.close();
};
if (require.main === module) {
  boot();
}
else {
  console.info('Running app as a module')
  exports.boot = boot;
  exports.shutdown = shutdown;
  exports.port = app.get('port');
}