var UserSync = function (userId) {

  if (!userId) {
    throw new Error('UserSync with no userId');
  }

  this.userId = userId;
};

UserSync.prototype = {

  // Utility function to instantiate a twitter API client
  getClient: function (req, config) {
    var TwitterApiClient = require('./TwitterApiClient');

    if (!config) {
      config = require('../config');
    }

    return new TwitterApiClient(config.tweetapp.twitter, req);
  },

  // Utility function to instantiate a DB client
  getDb: function () {
    var mongoskin = require('mongoskin'),
      config = require('../config'),
      dbUrl = config.tweetapp.dbUrl,
      db = mongoskin.db(dbUrl, { native_parser: true });

    return db;
  },

  // Sync the users tweets and mentions and create an analysis object
  syncUser: function (callback) {
    var client = this.getClient(),
      userId = this.userId,
      config = require('../config'),
      twitterConfig,
      T,
      mentionsPath = 'statuses/mentions_timeline',
      params = { count: 200 },
      db = this.getDb(),
      Twit = require('twit'),
      UserAnalysis = require('./UserAnalysis'),
      ua = new UserAnalysis(this.userId, db);

    // Get the last 200 tweets
    client.getAllTweetsForUser(userId, function (err, data) {
      if (err) {
        return callback(err);
      }

      // Sync the last 200 tweets
      ua.syncUserTweets(data, function (err) {
        if (err) {
          return callback(err);
        }

        // Create an anlysis object
        // It will be saved in mongodb
        ua.getAnalysis(function (err, analysis) {
          if (err) {
            return callback(err);
          }

          // Get the last 200 mentions
          db.collection('sessions').findOne({ 'user_id': userId }, function (err, result) {
            if (err) {
              return callback(err);
            }

            // We need to authenticate with the user's credentials
            // Instantiate a different client
            twitterConfig = {
              consumer_key: config.tweetapp.twitter.consumer_key,
              consumer_secret: config.tweetapp.twitter.consumer_secret,
              access_token: result.access_token,
              access_token_secret: result.access_token_secret
            };

            T = new Twit(twitterConfig);

            // Get the mentions
            T.get(mentionsPath, params, function (err, mentionsData) {
              if (err) {
                return callback(err);
              }

              // Sync the mentions
              ua.syncUserMentions(mentionsData, userId, function (err) {
                if (err) {
                  return callback(err);
                }

                // Add the mentions to the analysis object created above
                // This also gets saved to mongodb
                ua.getMentionsForAnalysis(function (err, mentions) {
                  if (err) {
                    return callback(err);
                  }

                  analysis.seven.mentionsCount = mentions.seven;
                  analysis.thirty.mentionsCount = mentions.thirty;
                  analysis.ninety.mentionsCount = mentions.ninety;

                  db.collection('analysis').update({ "date": analysis.date, "user_id": analysis.user_id }, analysis, { upsert: true }, function (err) {
                    if (err) {
                      callback(err);
                    }

                    console.log(analysis);

                    return callback(null, analysis);

                  });

                });

              });

            });
          });

        });

      });
    });
  }
};

module.exports = UserSync;