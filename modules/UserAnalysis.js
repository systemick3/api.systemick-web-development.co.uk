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
      sevenDaysAgo = new Date(),
      thirtyDaysAgo = new Date(),
      ninetyDaysAgo = new Date(),
      analysis = {
        seven: 'No data available',
        thirty: 'No data available',
        ninety: 'No data available'
      },
      params,
      db = this.db,
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

      var seven = 0, thirty = 0, ninety = 0;
      for (var i=0; i<tweets.length; i++) {
        if (tweets[i].ts > sevenDaysAgo.getTime()) {
          seven++;
        }

        if (tweets[i].ts > thirtyDaysAgo.getTime()) {
          thirty++;
        }

        if (tweets[i].ts > ninetyDaysAgo.getTime()) {
          ninety++;
        }
      }

      if (seven > 0) {
        analysis.seven = '' + seven + ' tweets';
      }
      if (thirty > 0) {
        analysis.thirty = '' + thirty + ' tweets';
      }
      if (ninety > 0) {
        analysis.ninety = '' + ninety + ' tweets';
      }

      callback(null, analysis);
    });
  },

  getTweetsSince: function (db, params, callback) {
    db.collection('tweets').find( { "user_id": params.userId, "ts": { $gt: params.ts } }, { sort:[['ts',-1]]} ).toArray(function(err, results) {
      if (err) {
        callback(err);
      }

      callback(null, results);
    });
  },

  syncUserTweets: function (tweets, callback) {
    var i,
      j,
      ids= [],
      db_ids = [],
      missing = [],
      result = { msg: 'success' },
      db = this.db;

    for (i=0; i<tweets.length; i++) {

      tweets[i].ts = new Date(tweets[i].created_at).getTime();
      tweets[i].user_id = tweets[i].user.id_str;

      (function (ix) {

        db.collection('tweets').update({ "id": tweets[ix].id }, tweets[ix], { upsert: true }, function(err) {
          if (err) {
            callback(err);
          }
          //console.log('updating tweet ' + tweets[ix].id);
        });

      })(i);

    }

    callback(null, result);

  },

  // Utility function to insert tweets pulled
  // from Twitter into database
  insertTweets: function (tweets, callback) {

    // Add a timestamp to each tweet
    // We need to check this in the analysis
    // Adding the user id to the tweet makes searching faster
    for (var i=0; i<tweets.length; i++) {
      tweets[i].ts = new Date(tweets[i].created_at).getTime();
      tweets[i].user_id = tweets[i].user.id_str;
    }

    this.db.collection('tweets').insert(tweets, function (err, result) {
      if (err) {
        callback(err);
      }

      callback(null, result);
    });
  }
};

module.exports = UserAnalysis;