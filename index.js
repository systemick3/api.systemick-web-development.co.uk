var http = require('http'),
  path = require('path'),
  fs = require('fs'),
  express = require('express'),
  mongoskin = require('mongoskin'),
  bodyParser = require('body-parser'),
  morgan = require('morgan'),
  routes = require('./routes'),
  config = require('./config'),
  app = express();

app.set('port', process.env.PORT || config.port || 3000);
app.set('env', process.env.NODE_ENV || config.env || 'development');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set("jsonp callback", true);

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
// Use Winston for logging errors
var logfile = fs.createWriteStream('./logs/access.log', { flags: 'a' });
app.use(morgan("combined", {stream: logfile}));
app.use(morgan("dev"));
var errorLogger = require('./utils/errorLogger');

// Database connection
var dbUrl = process.env.MONGOHQ_URL ||  config.mongo;
if (!dbUrl) {
  throw new Error('Missing url for mongodb');
}
var db = mongoskin.db(dbUrl, { native_parser:true });
var ObjectID = mongoskin.ObjectID;
var twitterCache = {};
app.use(function(req,res,next){
    req.db = db;
    req.objectID = ObjectID;
    req.twitterCache = twitterCache;
    next();
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Routes
app.get('/', function(req, res, next) {
  res.send('please select a collection, e.g., /api/skills');
});
app.get('/api', function(req, res, next) {
  res.send('please select a collection, e.g., /api/skills');
});
app.get('/twitter', function(req, res, next) {
  res.send('please select a collection, e.g., /api/skills');
});
//app.post('/login', routes.doLogin);
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

// Create server
var server = http.createServer(app);
var boot = function () {
  server.listen(app.get('port'), function(){
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