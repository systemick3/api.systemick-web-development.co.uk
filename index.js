var http = require('http'),
  path = require('path'),
  fs = require('fs'),
  express = require('express'),
  //express = require('express.io'),
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
app.get('/tweetapp/auth/analysis/tweet/:tweetId', tweetapp.getTweetAnalysis);

app.get('/tweetapp/auth/tweet/retweeters/:tweetId', tweetapp.getRetweeters);

app.get('/tweetapp/auth/tweet/mentions/:userId', tweetapp.getUserMentions);


// app.get('/tweetapp/auth/stream', tweetapp.getStream);

// Systemick routes
app.get('/twitter/user/:screenName/:tweetCount', routes.getTweetsForUser);
app.get('/systemick/collection/:collection', routes.getItems);
app.post('/systemick/collection/:collection', routes.addItem);
app.get('/systemick/collection/:collection/:id', routes.getItem);
app.put('/systemick/collection/:collection/:id', routes.updateItem);
app.delete('/systemick/collection/:collection/:id', routes.deleteItem);
app.post('/systemick/contact', routes.sendContactEmail);

//////////////////////////////////////////////////////////////////////////////

// Create server
var server = http.createServer(app);

var io = require('socket.io').listen(server);

// app.io.route('test-route', function(req) {
//     // respond to the event
// });

//var tweetapp = require('./routes/tweetapp/index');
//tweetapp(app, io);
//console.log(tweetapp);

//app.get('/mike/test', tweetapp.getStream);

// Fallback to 404 if route not found
app.get('*', function(req, res){
  res.sendStatus(404);
  res.end('Page not found');
});

// app.use(function(req, res, next) {
//   req.io = io;
//   next();
// });

/* TWITTER STREAM CODE
var Twit = require('twit');
var TWEETS_BUFFER_SIZE = 3;
 
var T = new Twit({
    consumer_key:         config.twitter.twitter_consumer_key,
    consumer_secret:      config.twitter.twitter_consumer_secret,
    access_token:         config.twitter.twitter_access_token,
    access_token_secret:  config.twitter.twitter_access_token_secret
});

var searchTerms = ['#php'];

console.log("Listening for tweets from San Francisco...");
var stream = T.stream('statuses/filter', { track: searchTerms });
//var stream = T.stream('statuses/filter', { track: 'mango' });
//var stream = T.stream('statuses/filter', { locations: [-122.75,36.8,-121.75,37.8] });
var tweetsBuffer = [];
 
stream.on('connect', function(request) {
    console.log('Connected to Twitter API');
});
 
stream.on('disconnect', function(message) {
    console.log('Disconnected from Twitter API. Message: ' + message);
});
 
stream.on('reconnect', function (request, response, connectInterval) {
  console.log('Trying to reconnect to Twitter API in ' + connectInterval + ' ms');
})
 
stream.on('tweet', function(tweet) {
  // if (tweet.geo == null) {
  //     return ;
  // }

  //console.log(tweet);

  //Create message containing tweet + username + profile pic + geo

  var msg = {};
  msg.text = tweet.text;
  //msg.geo = tweet.geo.coordinates;
  msg.created = tweet.created_at
  msg.user = {
      name: tweet.user.name,
      screen_name: tweet.user.screen_name,
      image: tweet.user.profile_image_url
  };
 
  console.log(msg);

  //push msg into buffer
  tweetsBuffer.push(msg);

  //send buffer only if full
  if (tweetsBuffer.length >= TWEETS_BUFFER_SIZE) {
      //broadcast tweets
      io.sockets.emit('tweets', tweetsBuffer);
      tweetsBuffer = [];
  }

});

var nbOpenSockets = 0;
 
io.sockets.on('connection', function(socket) {
    console.log('Client connected !');
    console.log(socket.request._query);
    var newTerm = '#' + socket.request._query.michael;

    // This doesn't work
    // Adding the new searchTerm doesn't cause tweets containing the new term
    // to be fetched from Twitter.
    if (searchTerms.indexOf(newTerm) < 0) {
      searchTerms.push(newTerm);
    }
    
    console.log(searchTerms);
    if (nbOpenSockets <= 0) {
        nbOpenSockets = 0;
        console.log('First active client. Start streaming from Twitter');
        stream.start();
    }
 
    nbOpenSockets++;
 
    socket.on('disconnect', function() {
        console.log('Client disconnected !');
        nbOpenSockets--;
 
        if (nbOpenSockets <= 0) {
            nbOpenSockets = 0;
            console.log("No active client. Stop streaming from Twitter");
            searchTerms = [];
            stream.stop();
        }
    });
});
*/

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

//exports.app = app;