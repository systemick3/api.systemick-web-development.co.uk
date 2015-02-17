// routes/index.js
// Pull all routes from files in same directory

exports.attachHandlers = function attachHandlers(app) {
  require('./systemick')(app);
  require('./tweetapp')(app);
  require('./tweetappUsers')(app);
};
