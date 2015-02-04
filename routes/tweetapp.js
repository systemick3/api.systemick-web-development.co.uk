module.exports = function attachHandlers (app) {

  // Tweetapp routes
  app.get('/tweetapp/auth/tweet/user/:screenName/:tweetCount', getTweetsForUser);
  app.get('/tweetapp/auth/tweet/user/:screenName/:tweetCount/:maxId', getTweetsForUser);
  app.get('/tweetapp/auth/tweet/one/:id', getTweet);
  app.get('/tweetapp/auth/analysis/user/:userId', getUserAnalysis);
  app.get('/tweetapp/auth/analysis/chart/:userId', getUserAnalyses);
  app.get('/tweetapp/auth/tweet/retweeters/:tweetId', getRetweeters);
  app.get('/tweetapp/auth/tweet/mentions/:userId', getUserMentions);
  app.get('/tweetapp/auth/tweet/replies/:userId/:tweetId', getReplies);
  app.get('/tweetapp/auth/tweet/trends', getTrends);
  app.get('/tweetapp/auth/tweet/sentiment/:tweetId', getSentiment);
  app.get('/tweetapp/auth/tweet/sentiment/:tweetId/:isReply', getSentiment);
};

// Get tweets for user
var getTweetsForUser = function (req, res, next) {
  var client = getClient(req),
    i,
    db = req.tweetappDb,
    params = {
      screen_name: req.params.screenName, // the user id passed in as part of the route
      count: req.params.tweetCount // how many tweets to return
    };

  if (req.params.maxId) {
    params.max_id = req.params.maxId;
  }

  client.getUserTimelineTweets(params, function (err, data) {
    if (err) {
      return next(err);
    }

    for (i=0; i<data.length; i++) {

      (function (ix) {
        db.collection('mentions').count({ 'in_reply_to_status_id_str': data[ix].id_str }, function (err, result) {
          if (result > 0) {
            data[ix].has_replies = true;
          }
        });
      })(i);
    }

    res.status(200).send(data);
  });
};

var getTweet = function (req, res, next) {
  var client = getClient(req);
  var params = {
    id: req.params.id // the id of the tweet
  };

  client.getTweet(params, function (err, data) {
    if (err) {
      return next(err);
    }

    res.status(200).send(data);
  });
};

var getUserAnalysis = function (req, res, next) {
  var start = new Date().getTime(),
    client = getClient(req),
    userId = req.params.userId,
    db = req.tweetappDb,
    UserAnalysis = require('../modules/UserAnalysis'),
    ua = new UserAnalysis(req.params.userId, db),
    params = {
      count: 200
    };

  client.getAllTweetsForUser(userId, function (err, data) {
    if (err) {
      return next(err);
    }

    ua.syncUserTweets(data, function (err, result) {
      if (err) {
        return next(err);
      }

      ua.getAnalysis(function (err, analysis) {
        if (err) {
          return next(err);
        }

        var end = new Date().getTime();
        var secs = end - start;
        res.status(200).send({ msg: 'success', secs: secs, 'analysis': analysis });
      });

    });

  });

};

var getUserAnalyses = function (req, res, next) {
  var start = new Date().getTime(),
    userId = req.params.userId,
    db = req.tweetappDb,
    UserAnalysis = require('../modules/UserAnalysis'),
    ua = new UserAnalysis(req.params.userId, db);

  ua.getAnalyses(function (err, analyses) {
    if (err) {
      return next(err);
    }

    var end = new Date().getTime();
    var secs = end - start;
    res.status(200).send({ msg: 'success', secs: secs, 'data': analyses });
  });
};

var getReplies = function (req, res, next) {
  var start = new Date().getTime(),
    end,
    i,
    secs,
    replies = [],
    userId = req.params.userId,
    tweetId = req.params.tweetId,
    db = req.tweetappDb,
    UserAnalysis = require('../modules/UserAnalysis'),
    ua = new UserAnalysis(req.params.userId, db);

  ua.getReplies(tweetId, replies, function (err, data) {
    end = new Date().getTime();
    secs = end - start;
    res.status(200).send({ msg: 'success', secs: secs, replies: data} );
  });
};

var getRetweeters = function (req, res, next) {
  var client = getClient(req),
    ids,
    retweeter,
    retweeters = [],
    reach = 0;

  var params = {
    id: req.params.tweetId,
  };

  client.getRetweeters(params, function (err, data) {
    if (err) {
      return next(err);
    }

    delete params.id;
    ids = data.ids;

    if (ids.length) {

      params.user_id = ids.join();

      client.getUsers(params, function (err, users) {
        if (err) {
          return next(err);
        }

        for (var i=0; i<users.length; i++) {
          retweeter = {};
          retweeter.screen_name = users[i].screen_name;
          retweeter.followers_count = users[i].followers_count;
          retweeters.push(retweeter);
          reach += users[i].followers_count;
        }

        res.status(200).send({ msg: 'success', retweeters: retweeters, reach: reach });
      });

    }
    else {
      res.status(404).send()
    }

  });
};

var getUserMentions = function(req, res, next) {
  var start = new Date().getTime(),
    config = require('../config'),
    db = req.tweetappDb,
    userId = req.params.userId,
    Twit = require('twit'),
    T,
    twitterConfig,
    params = { count: 200 },
    path = 'statuses/mentions_timeline',
    UserAnalysis = require('../modules/UserAnalysis'),
    ua = new UserAnalysis(req.params.userId, db);

  db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
    if (err) {
      return next(err);
    }

    twitterConfig = {
      consumer_key: config.tweetapp.twitter.consumer_key,
      consumer_secret: config.tweetapp.twitter.consumer_secret,
      access_token: result.access_token,
      access_token_secret: result.access_token_secret
    };

    T = new Twit(twitterConfig);

    T.get(path, params, function (err, data, resp) {
      if (err) {
        return next(err);
      }

      ua.syncUserMentions(data, userId, function (err, result) {
        if (err) {
          return next(err);
        }

        ua.getMentionsForAnalysis(function (err, analysis) {
          if (err) {
            return next(err);
          }

          var end = new Date().getTime();
          var secs = end - start;
          res.status(200).send({ msg: 'success', secs: secs, 'mentions': analysis });
        });

      });

    });

  });
};

var getTrends = function (req, res, next) {
  var client = getClient(req),
    config = require('../config');

  var params = {
    id: config.tweetapp.uk_woeid,
  };

  client.getTrends(params, function (err, data) {
    console.log(data);
    res.status(200).send({ msg: 'success', data: data })
  });
};

var getSentiment = function (req, res, next) {
  var db = req.tweetappDb,
    collection = 'tweets',
    sentiment = require('sentiment');

  // If the sentiment requested is a reply
  // look for it in the mentions collection
  if (req.params.isReply) {
    collection = 'mentions';
  }

  db.collection(collection).findOne({ id_str: req.params.tweetId }, function (err, result) {
    if (err) {
      return next(err);
    }

    var sen = sentiment(result.text);

    res.status(200).send({ msg: 'success', id: req.params.tweetId, sentiment: sen });
  });
};

var getClient = function(req, config) {
	var config,
    TwitterApiClient = require('../modules/TwitterApiClient');

  if (!config) {
    config = require('../config');
  }

	return new TwitterApiClient(config.tweetapp.twitter, req);
};