// Get tweets for user
exports.getTweetsForUser = function (req, res, next) {
  var client = getClient(req);

  var params = {
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

    res.status(200).send(data);
  });
};

exports.getTweet = function (req, res, next) {
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

exports.getUserAnalysis = function (req, res, next) {
  var start = new Date().getTime(),
    client = getClient(req),
    userId = req.params.userId,
    db = req.tweetappDb,
    UserAnalysis = require('../../modules/UserAnalysis'),
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

exports.getTweetAnalysis = function(req, res, next) {
  
};

exports.getMentions = function (req, res, next) {

};

exports.getRetweeters = function (req, res, next) {
  var client = getClient(req),
    ids,
    usernames = [],
    range = 0;

  var params = {
    id: req.params.tweetId,
    //count: 100
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
          usernames.push(users[i].screen_name);
          range += users[i].followers_count;
        }

        res.status(200).send({ msg: 'success', retweeters: usernames, range: range });
      });

    }
    else {
      res.status(404).send()
    }

  });
};

exports.getUserMentions = function(req, res, next) {
  var start = new Date().getTime(),
    config = require('../../config'),
    db = req.tweetappDb,
    userId = req.params.userId,
    Twit = require('twit'),
    T,
    twitterConfig,
    params = { count: 200 },
    path = 'statuses/mentions_timeline',
    UserAnalysis = require('../../modules/UserAnalysis'),
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

var getClient = function(req, config) {
	var config;
	var TwitterApiClient = require('../../modules/TwitterApiClient');

  if (!config) {
    config = require('../../config');
  }

	return new TwitterApiClient(config.tweetapp.twitter, req);
};

/*module.exports = function(app, io){
	//console.log('TWEETAPP');
  app.get('/tweetapp/auth/test', function(req, res){
    
    //I would like here be able to send to all clients in room "test"
    //io.to('test').emit('some event');

	  var config = require('../../config');

	  var Twit = require('twit');
		var TWEETS_BUFFER_SIZE = 3;
		 
		var T = new Twit({
		    consumer_key:         config.twitter.twitter_consumer_key,
		    consumer_secret:      config.twitter.twitter_consumer_secret,
		    access_token:         config.twitter.twitter_access_token,
		    access_token_secret:  config.twitter.twitter_access_token_secret
		});

		console.log("Listening for tweets from San Francisco...");
		//var stream = T.stream('statuses/filter', { track: ['#javascript'] });
		//var stream = T.stream('statuses/filter', { track: 'mango' });
		var stream = T.stream('statuses/filter', { locations: [-122.75,36.8,-121.75,37.8] });
		var tweetsBuffer = [];
		 
		stream.on('connect', function(request) {
		    console.log('Connected to Twitter API');
		});
		 
		stream.on('disconnect', function(message) {
		    console.log('Disconnected from Twitter API. Message: ' + message);
		});
		 
		stream.on('reconnect', function (request, response, connectInterval) {
		  console.log('Trying to reconnect to Twitter API in ' + connectInterval + ' ms');
		});
 
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

    //res.send({msg:'Hello World'});
  });
};*/