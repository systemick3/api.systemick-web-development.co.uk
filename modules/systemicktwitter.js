var SystemickTwitter = function() {

};

SystemickTwitter.prototype = {

  getTweetsForUser: function(req, callback) {
    var config = require('../config'),
      MAX_WIDTH = 305,
      OEMBED_URL = 'statuses/oembed',
      USER_TIMELINE_URL = 'statuses/user_timeline',
      cacheKey = USER_TIMELINE_URL + '/' + req.params.screenName + '/' + req.params.tweetCount,
      Twit = require('twit'),
      twitter = new Twit({
        consumer_key:             config.twitter.twitter_consumer_key,
        consumer_secret:          config.twitter.twitter_consumer_secret,
        access_token:             config.twitter.twitter_access_token,
        access_token_secret:      config.twitter.twitter_access_token_secret
      }),
      oEmbedTweets = [], 
      tweets = [],
      cached = req.twitterCache[USER_TIMELINE_URL],
      now = new Date(),
      hour = 1000 * 60 * 60;

    if (cached && (+now - cached.when < hour))  {
      console.log('in getUserTweets retrieving tweets from cache');
      callback(null, cached.data);
    }
    else {
      var params = {
        screen_name: req.params.screenName, // the user id passed in as part of the route
        count: req.params.tweetCount // how many tweets to return
      };

      // request data 
      twitter.get(USER_TIMELINE_URL, params, function (err, data, resp) {
        if (err) {
          return callback(err);
        }

        tweets = data;
        var i = 0, len = tweets.length;

        for(i; i < len; i++) {
          getOEmbed(tweets[i]);
        }
      });

      /**
       * requests the oEmbed html
       */
      function getOEmbed (tweet) {

        // oEmbed request params
        var params = {
          "id": tweet.id_str,
          "maxwidth": MAX_WIDTH,
          "hide_thread": true,
          "omit_script": true
        };

        // request data 
        twitter.get(OEMBED_URL, params, function (err, data, resp) {
          if (err) {
            return callback(err);
          }

          tweet.oEmbed = data;
          oEmbedTweets.push(tweet);

          // do we have oEmbed HTML for all Tweets?
          if (oEmbedTweets.length == tweets.length) {
            console.log('in getUserTweets fetching tweets from Twitter API');
            // Cache the results for one hour
            var date = new Date();
            req.twitterCache[USER_TIMELINE_URL] = {
              data: oEmbedTweets,
              when: +date
            };
            callback(null, oEmbedTweets);
          }
        });
      }
    }
  },
};

module.exports = SystemickTwitter;