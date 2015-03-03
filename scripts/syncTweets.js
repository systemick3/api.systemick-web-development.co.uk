#!/usr/bin/env node

// A node shell script to sync tweets for each user in the db;

var UserSync = require('../modules/UserSync'),
  user,
  ua,
  i,
  d = new Date(),
  sevenDaysAgo = new Date(),
  result = {},
  mongoskin = require('mongoskin'),
  config = require('../config'),
  dbUrl = config.tweetapp.dbUrl,
  db = mongoskin.db(dbUrl, { native_parser:true });

sevenDaysAgo.setDate(d.getDate() - 7);

console.log(sevenDaysAgo.getTime());

db.collection('users').find({"last_sync": {$lt: sevenDaysAgo.getTime()}}).toArray(function (err, documents) {
  if (err) {
    console.log(err);
  }

  for (i = 0; i < documents.length; i++) {

    (function (ix) {
      user = documents[ix];
      user.last_sync = d.getTime();

      ua = new UserSync(user.id_str);

      ua.syncUser(function (err) {
        if (err) {
          callback(err);
        }

        db.collection('users').update({ "id_str": user.id_str }, user, { upsert: true }, function(err) {
          if (err) {
            callback(err);
          }

          console.log('Done');
        });

      });

    }(i));
  }

});

process.exit(0);