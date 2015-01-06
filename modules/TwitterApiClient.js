var URL_USER_TIMELINE = 'statuses/user_timeline',
  URL_USER = 'users/show',
  URL_TWEET = 'statuses/show/:id',
  MAX_USER_TWEETS = 200;

var TwitterApiClient = function (twitterConfig, req) {
  if (!twitterConfig) {
    throw new Error('TwitterApiClient with no config');
  }

  var Twit = require('twit');
  this.client = new Twit(twitterConfig);
  this.cache = {};
  this.req = req;
};

TwitterApiClient.prototype = {

  // It is possible to force a request to the Twitter API 
  // by not providing a cacheKey
  get: function (path, params, cacheKey, callback) {
    var cached,
      now = new Date(),
      hour = 1000 * 60 * 60,
      twitterCache = this.req.twitterCache;

    if (cacheKey) {
      cached = this.req.twitterCache[cacheKey];
    }

    if (cached && (+now - cached.when < hour)) {
      console.log('in TwitterApiClient retrieving tweets from cache');
      callback(null, cached.data);
    }
    else {
      console.log('in TwitterApiClient retrieving tweets from Twitter');
      this.client.get(path, params, function (err, data, resp) {
        if (err) {
          console.log('TWITTER ERROR');
          console.log(err);
          return callback(err);
        }

        var date = new Date();
        twitterCache[cacheKey] = {
          data: data,
          when: +date
        };
        return callback(null, data);
      });
    }
  },

  getUserData: function (params, callback) {
    var cacheKey = URL_USER + '/' + params.user_id;
    return this.get(URL_USER, params, cacheKey, callback);
  },

  getUserTimelineTweets: function (params, callback) {
    var cacheKey = URL_USER_TIMELINE + '/' + params.screen_name + '/' + params.count;

    if (params.max_id) {
      cacheKey += '/' + params.max_id;

      // Twitter returns the tweet corresponding to max_id
      // Need to get count + 1 and discard the first tweet in the array
      params.count++;
    }

    return this.get(URL_USER_TIMELINE, params, cacheKey, callback);
  },

  getTweet: function (params, callback) {
    var cacheKey = URL_TWEET + '/' + params.id;
    return this.get(URL_TWEET, params, cacheKey, callback);
  },

  getAllTweetsForUser: function (userId, callback) {
    var path = URL_USER_TIMELINE;
    var params = {
      user_id: userId,
      count: MAX_USER_TWEETS
    };

    this.get(path, params, null, function (err, data) {
      if (err) {
        return callback(null);
      }

      // Return the last 200 tweets
      return callback(null, data);
    });
  },

  post: function (callback) {

  }

};

module.exports = TwitterApiClient;