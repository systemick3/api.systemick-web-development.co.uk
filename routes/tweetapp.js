// Routes for tweetapp

// Utility function to instantiate a twitter API client
var getClient = function (req, twitterConfig) {
  var TwitterApiClient = require('../modules/TwitterApiClient');

  if (!twitterConfig) {
    twitterConfig = require('../config').tweetapp.twitter;
  }

  return new TwitterApiClient(twitterConfig, req);
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

    for (i = 0; i < data.length; i++) {

      (function (ix) {
        db.collection('mentions').count({ 'in_reply_to_status_id_str': data[ix].id_str }, function (err, result) {
          if (err) {
            return next(err);
          }

          if (result > 0) {
            data[ix].has_replies = true;
          }
        });
      }(i));

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

var getUserAnalyses = function (req, res, next) {
  var start = new Date().getTime(),
    db = req.tweetappDb,
    UserAnalysis = require('../modules/UserAnalysis'),
    ua = new UserAnalysis(req.params.userId, db);

  ua.getAnalyses(parseInt(req.params.analysisCount), function (err, analyses) {
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
    secs,
    replies = [],
    tweetId = req.params.tweetId,
    db = req.tweetappDb,
    UserAnalysis = require('../modules/UserAnalysis'),
    ua = new UserAnalysis(req.params.userId, db);

  ua.getReplies(tweetId, replies, function (err, data) {
    if (err) {
      return next(err);
    }

    end = new Date().getTime();
    secs = end - start;
    res.status(200).send({ msg: 'success', secs: secs, replies: data});
  });
};

var getRetweeters = function (req, res, next) {
  var client = getClient(req),
    ids,
    i,
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

        for (i = 0; i < users.length; i++) {
          retweeter = {};
          retweeter.screen_name = users[i].screen_name;
          retweeter.followers_count = users[i].followers_count;
          retweeters.push(retweeter);
          reach += users[i].followers_count;
        }

        res.status(200).send({ msg: 'success', retweeters: retweeters, reach: reach });
      });

    } else {
      res.status(404).send();
    }

  });
};

var getUserMentions = function (userId, db, req, callback) {
  var config = require('../config'),
    client,
    twitterConfig,
    params = { count: 200, userId: userId },
    path = 'statuses/mentions_timeline',
    UserAnalysis = require('../modules/UserAnalysis'),
    ua = new UserAnalysis(userId, db);

  db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
    if (err) {
      return callback(err);
    }

    twitterConfig = {
      consumer_key: config.tweetapp.twitter.consumer_key,
      consumer_secret: config.tweetapp.twitter.consumer_secret,
      access_token: result.access_token,
      access_token_secret: result.access_token_secret
    };

    client = getClient(req, twitterConfig);

    client.getMentions(params, function (err, data) {
      if (err) {
        return callback(err);
      }

      ua.syncUserMentions(data, userId, function (err) {
        if (err) {
          return callback(err);
        }

        ua.getMentionsForAnalysis(function (err, analysis) {
          if (err) {
            return callback(err);
          }

          return callback(null, analysis);
        });

      });
    });

  });
};

var getUserAnalysis = function (req, res, next) {
  var start = new Date().getTime(),
    client = getClient(req),
    userId = req.params.userId,
    db = req.tweetappDb,
    UserAnalysis = require('../modules/UserAnalysis'),
    ua = new UserAnalysis(req.params.userId, db);

  client.getAllTweetsForUser(userId, function (err, data) {
    if (err) {
      return next(err);
    }

    ua.syncUserTweets(data, function (err) {
      if (err) {
        return next(err);
      }

      ua.getAnalysis(function (err, analysis) {
        if (err) {
          return next(err);
        }

        getUserMentions(userId, db, req, function (err, results) {
          if (err) {
            return next(err);
          }

          analysis.seven.mentionsCount = results.seven;
          analysis.thirty.mentionsCount = results.thirty;
          analysis.ninety.mentionsCount = results.ninety;

          db.collection('analysis').update({ "date": analysis.date, "user_id": analysis.user_id }, analysis, { upsert: true }, function (err) {
            if (err) {
              callback(err);
            }

            var end = new Date().getTime();
            var secs = end - start;
            res.status(200).send({ msg: 'success', secs: secs, 'analysis': analysis });
          });

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
    if (err) {
      return next(err);
    }

    res.status(200).send({ msg: 'success', data: data });
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

var postStatusUpdate = function (req, res, next) {
  var userId = req.body.userId,
    client,
    config = require('../config'),
    db = req.tweetappDb,
    params = {'status': req.body.message};

    if (req.body.tweetId) {
      params.in_reply_to_status_id = req.body.tweetId;
    }

  db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
    if (err) {
      return next(err);
    }

    twitterConfig = {
      consumer_key: 'f3dJQdmu4bnLrrv4iLOH5pxZS',
      consumer_secret: 'eGkopaQyNQdPtK5sRQG4vBjOMn1VvcMNpf6QGqz0Qs0NRhEs9X',
      access_token: result.access_token,
      access_token_secret: result.access_token_secret
    };

    client = getClient(req, twitterConfig);

    client.postStatusUpdate(params, function (err, result) {
      if (err) {
        return next(err);
      }

      if (result.id_str) {
        res.status(201).send({'msg': 'Success', 'tweet': result});
      } else {
        res.status(401).send({'msg': 'Error'})
      }
    });

  });
};

var postStatusDestroy = function (req, res, next) {
  var userId = req.body.userId,
    tweetId = req.body.tweetId,
    client,
    config = require('../config'),
    db = req.tweetappDb,
    params = {'status': req.body.message};

    if (req.body.tweetId) {
      params.in_reply_to_status_id = req.body.tweetId;
    }

  db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
    if (err) {
      return next(err);
    }

    twitterConfig = {
      consumer_key: 'f3dJQdmu4bnLrrv4iLOH5pxZS',
      consumer_secret: 'eGkopaQyNQdPtK5sRQG4vBjOMn1VvcMNpf6QGqz0Qs0NRhEs9X',
      access_token: result.access_token,
      access_token_secret: result.access_token_secret
    };

    client = getClient(req, twitterConfig);

    client.postStatusDestroy(tweetId, function (err, result) {
      if (err) {
        return next(err);
      }

      if (result.id_str) {
        res.status(201).send({'msg': 'Success'});
      } else {
        res.status(401).send({'msg': 'Error'})
      }
    });

  });
};

var postStatusRetweet = function (req, res, next) {
  var userId = req.body.userId,
    tweetId = req.body.tweetId,
    client,
    config = require('../config'),
    db = req.tweetappDb;

  db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
    if (err) {
      return next(err);
    }

    twitterConfig = {
      consumer_key: 'f3dJQdmu4bnLrrv4iLOH5pxZS',
      consumer_secret: 'eGkopaQyNQdPtK5sRQG4vBjOMn1VvcMNpf6QGqz0Qs0NRhEs9X',
      access_token: result.access_token,
      access_token_secret: result.access_token_secret
    };

    client = getClient(req, twitterConfig);

    client.postStatusRetweet(tweetId, function (err, result) {
      if (err) {
        return next(err);
      }

      if (result.id_str) {
        res.status(201).send({'msg': 'Success', 'tweet': result});
      } else {
        res.status(401).send({'msg': 'Error'})
      }
    });

  });
};

var postStatusFavourite = function (req, res, next) {
  var userId = req.body.userId,
    tweetId = req.body.tweetId,
    client,
    config = require('../config'),
    db = req.tweetappDb,
    params = {'id': tweetId};

  db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
    if (err) {
      return next(err);
    }

    twitterConfig = {
      consumer_key: 'f3dJQdmu4bnLrrv4iLOH5pxZS',
      consumer_secret: 'eGkopaQyNQdPtK5sRQG4vBjOMn1VvcMNpf6QGqz0Qs0NRhEs9X',
      access_token: result.access_token,
      access_token_secret: result.access_token_secret
    };

    client = getClient(req, twitterConfig);

    client.postStatusFavourite(params, function (err, result) {
      if (err) {
        return next(err);
      }

      if (result.id_str) {
        res.status(201).send({'msg': 'Success'});
      } else {
        res.status(401).send({'msg': 'Error'})
      }
    });

  });
};

var postStatusUnFavourite = function (req, res, next) {
  var userId = req.body.userId,
    tweetId = req.body.tweetId,
    client,
    config = require('../config'),
    db = req.tweetappDb,
    params = {'id': tweetId};

  db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
    if (err) {
      return next(err);
    }

    twitterConfig = {
      consumer_key: 'f3dJQdmu4bnLrrv4iLOH5pxZS',
      consumer_secret: 'eGkopaQyNQdPtK5sRQG4vBjOMn1VvcMNpf6QGqz0Qs0NRhEs9X',
      access_token: result.access_token,
      access_token_secret: result.access_token_secret
    };

    client = getClient(req, twitterConfig);

    client.postStatusUnFavourite(params, function (err, result) {
      if (err) {
        return next(err);
      }

      if (result.id_str) {
        res.status(201).send({'msg': 'Success'});
      } else {
        res.status(401).send({'msg': 'Error'})
      }
    });

  });
};

var postStatusReply = function (req, res, next) {
  var userId = req.body.userId,
    client,
    config = require('../config'),
    db = req.tweetappDb,
    params = {'status': req.body.message, 'in_reply_to_status_id': req.body.tweetId};

  db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
    if (err) {
      return next(err);
    }

    twitterConfig = {
      consumer_key: 'f3dJQdmu4bnLrrv4iLOH5pxZS',
      consumer_secret: 'eGkopaQyNQdPtK5sRQG4vBjOMn1VvcMNpf6QGqz0Qs0NRhEs9X',
      access_token: result.access_token,
      access_token_secret: result.access_token_secret
    };

    client = getClient(req, twitterConfig);

    client.postStatusReply(params, function (err, result) {
      if (err) {
        return next(err);
      }

      if (result.id_str) {
        res.status(201).send({'msg': 'Success'});
      } else {
        res.status(401).send({'msg': 'Error'})
      }
    });

  });
};

module.exports = function attachHandlers(app) {

  // Tweetapp routes
  app.get('/tweetapp/auth/tweet/user/:screenName/:tweetCount', getTweetsForUser);
  app.get('/tweetapp/auth/tweet/user/:screenName/:tweetCount/:maxId', getTweetsForUser);
  app.get('/tweetapp/auth/tweet/one/:id', getTweet);
  app.get('/tweetapp/auth/analysis/user/:userId', getUserAnalysis);
  app.get('/tweetapp/auth/analysis/chart/:userId/:analysisCount', getUserAnalyses);
  app.get('/tweetapp/auth/tweet/retweeters/:tweetId', getRetweeters);
  app.get('/tweetapp/auth/tweet/replies/:userId/:tweetId', getReplies);
  app.get('/tweetapp/auth/tweet/trends', getTrends);
  app.get('/tweetapp/auth/tweet/sentiment/:tweetId', getSentiment);
  app.get('/tweetapp/auth/tweet/sentiment/:tweetId/:isReply', getSentiment);
  app.post('/tweetapp/auth/tweet/new', postStatusUpdate);
  app.post('/tweetapp/auth/tweet/destroy', postStatusDestroy);
  app.post('/tweetapp/auth/tweet/retweet', postStatusRetweet);
  app.post('/tweetapp/auth/tweet/favourite', postStatusFavourite);
  app.post('/tweetapp/auth/tweet/unfavourite', postStatusUnFavourite);
  app.post('/tweetapp/auth/tweet/reply', postStatusUpdate);
};