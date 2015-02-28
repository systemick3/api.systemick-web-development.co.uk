var UserAnalysis = function (userId, db) {
  if (!userId) {
    throw new Error('UserAnalysis with no userId');
  }

  if (!db) {
    throw new Error('UserAnalysis with no db');
  }

  this.db = db;
  this.userId = userId;
};

UserAnalysis.prototype = {

  getAnalysis: function (callback) {
    var d = new Date(),
      today = d.toISOString(),
      key = today.substring(0, 10),
      i,
      db = this.db,
      sevenDaysAgo = new Date(),
      thirtyDaysAgo = new Date(),
      ninetyDaysAgo = new Date(),
      analysis = {
        seven: {
          tweetCount: 0,
          favouriteCount: 0,
          retweetCount: 0,
          tweetsRetweetedCount: 0
        },
        thirty: {
          tweetCount: 0,
          favouriteCount: 0,
          retweetCount: 0,
          tweetsRetweetedCount: 0
        },
        ninety: {
          tweetCount: 0,
          favouriteCount: 0,
          retweetCount: 0,
          tweetsRetweetedCount: 0
        },
      },
      params,
      userId = this.userId,
      getTweetsSince = this.getTweetsSince;

    sevenDaysAgo.setDate(d.getDate() - 7);
    thirtyDaysAgo.setDate(d.getDate() - 30);
    ninetyDaysAgo.setDate(d.getDate() - 90);

    params = {
      userId: userId,
      ts: ninetyDaysAgo.getTime()
    };

    getTweetsSince(db, params, function (err, tweets) {
      if (err) {
        callback(err);
      }

      for (i = 0; i < tweets.length; i++) {
        if (tweets[i].ts > sevenDaysAgo.getTime()) {
          analysis.seven.tweetCount++;
          analysis.seven.favouriteCount += tweets[i].favorite_count;

          if (!tweets[i].retweeted_status) {
            analysis.seven.retweetCount += tweets[i].retweet_count;
          }

          if (tweets[i].retweeted) {
            analysis.seven.tweetsRetweetedCount++;
          }
        }

        if (tweets[i].ts > thirtyDaysAgo.getTime()) {
          analysis.thirty.tweetCount++;
          analysis.thirty.favouriteCount += tweets[i].favorite_count;

          if (!tweets[i].retweeted_status) {
            analysis.thirty.retweetCount += tweets[i].retweet_count;
          }

          if (tweets[i].retweeted) {
            analysis.thirty.tweetsRetweetedCount++;
          }
        }

        if (tweets[i].ts > ninetyDaysAgo.getTime()) {
          analysis.ninety.tweetCount++;
          analysis.ninety.favouriteCount += tweets[i].favorite_count;

          if (!tweets[i].retweeted_status) {
            analysis.ninety.retweetCount += tweets[i].retweet_count;
          }

          if (tweets[i].retweeted) {
            analysis.ninety.tweetsRetweetedCount++;
          }
        }
      }

      // Create the analysis and pass it to the callback
      // It will be written to mongo in the route file
      analysis.user_id = userId;
      analysis.created_at = d.getTime();
      analysis.date = key;

      db.collection('users').findOne({'id_str': userId}, function (err, result) {
        if (err) {
          callback(err);
        }

        analysis.seven.followersCount = result.followers_count;

        callback(null, analysis);
      });

    });
  },

  getAnalyses: function (count, callback) {
    var db = this.db,
      userId = this.userId;

    db.collection('analysis').find({ user_id: userId }, { sort: [['created_at', -1]]}).limit(count).toArray(function (err, results) {
      if (err) {
        callback(err);
      }

      callback(null, results);
    });
  },

  getMentionsForAnalysis: function (callback) {
    var d = new Date(),
      today = d.toISOString(),
      key = today.substring(0, 10),
      sevenDaysAgo = new Date(),
      thirtyDaysAgo = new Date(),
      ninetyDaysAgo = new Date(),
      i,
      analysis = {
        seven: 0,
        thirty: 0,
        ninety: 0,
      },
      params,
      db = this.db,
      userId = this.userId,
      getUserMentionsSince = this.getUserMentionsSince;

    sevenDaysAgo.setDate(d.getDate() - 7);
    thirtyDaysAgo.setDate(d.getDate() - 30);
    ninetyDaysAgo.setDate(d.getDate() - 90);

    params = {
      userMentionedId: userId,
      ts: ninetyDaysAgo.getTime()
    };

    getUserMentionsSince(db, params, function (err, mentions) {
      if (err) {
        callback(err);
      }

      for (i = 0; i < mentions.length; i++) {
        if (mentions[i].ts > sevenDaysAgo.getTime()) {
          analysis.seven++;
        }

        if (mentions[i].ts > thirtyDaysAgo.getTime()) {
          analysis.thirty++;
        }

        if (mentions[i].ts > ninetyDaysAgo.getTime()) {
          analysis.ninety++;
        }
      }

      callback(null, analysis);

    });
  },

  getTweetsSince: function (db, params, callback) {
    db.collection('tweets').find({ "user_id": params.userId, "ts": {$gt: params.ts}}, {sort: [['ts', -1]]}).toArray(function (err, results) {
      if (err) {
        callback(err);
      }

      callback(null, results);
    });
  },

  getUserMentionsSince: function (db, params, callback) {
    db.collection('mentions').find({ "user_mentioned_id": params.userMentionedId, "ts": {$gt: params.ts}}, {sort: [['ts', -1]]}).toArray(function (err, results) {
      if (err) {
        callback(err);
      }

      callback(null, results);
    });
  },

  syncUserTweets: function (tweets, callback) {
    var i,
      result = { msg: 'success' },
      db = this.db;

    for (i = 0; i < tweets.length; i++) {

      tweets[i].ts = new Date(tweets[i].created_at).getTime();
      tweets[i].user_id = tweets[i].user.id_str;

      (function (ix) {

        db.collection('tweets').update({ "id": tweets[ix].id }, tweets[ix], { upsert: true }, function (err) {
          if (err) {
            callback(err);
          }
        });

      }(i));

    }

    callback(null, result);

  },

  syncUserMentions: function (mentions, userMentionedId, callback) {
    var i,
      result = { msg: 'success' },
      db = this.db;

    for (i = 0; i < mentions.length; i++) {

      mentions[i].ts = new Date(mentions[i].created_at).getTime();
      mentions[i].user_id = mentions[i].user.id_str;
      mentions[i].user_mentioned_id = userMentionedId;

      (function (ix) {

        db.collection('mentions').update({"id": mentions[ix].id}, mentions[ix], {upsert: true}, function (err) {
          if (err) {
            callback(err);
          }
        });

      })(i);

    }

    callback(null, result);

  },

  getReplies: function (tweetId, replies, callback) {
    var db = this.db,
      ua = this;

    db.collection('mentions').findOne({ 'in_reply_to_status_id_str': tweetId }, function (err, result) {
      if (err) {
        callback(err);
      }

      if (!result) {
        return callback(null, replies);
      }

      replies.push(result);
      return ua.getReplies(result.id_str, replies, callback);
    });
  },

  // Utility function to insert tweets pulled
  // from Twitter into database
  insertTweets: function (tweets, callback) {
    var i;

    // Add a timestamp to each tweet
    // We need to check this in the analysis
    // Adding the user id to the tweet makes searching faster
    for (i = 0; i < tweets.length; i++) {
      tweets[i].ts = new Date(tweets[i].created_at).getTime();
      tweets[i].user_id = tweets[i].user.id_str;
    }

    this.db.collection('tweets').insert(tweets, function (err, result) {
      if (err) {
        callback(err);
      }

      callback(null, result);
    });
  },

  getAllUsers: function (callback) {
    // Code to get all users goes here
  }
};

module.exports = UserAnalysis;