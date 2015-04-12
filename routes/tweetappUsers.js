// Toutes for tweetapp users

var twitterLogin = function (req, res, next) {
  var config = require('../config'),
    OAuth = require('oauth').OAuth,
    oauth = new OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      config.tweetapp.twitter.consumer_key,
      config.tweetapp.twitter.consumer_secret,
      "1.0",
      config.baseUrl + "/tweetapp/login/twitter/callback",
      "HMAC-SHA1"
    );

  oauth.getOAuthRequestToken(function (error, oauth_token, oauth_token_secret) {
    if (error) {
      console.log(error);
      res.send("Authentication Failed!");
      next(error);
    } else {
      req.session.oauth = {
        token: oauth_token,
        token_secret: oauth_token_secret
      };

      req.session.siteUrl = req.body.siteUrl;

      res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token);
    }
  });
};

var twitterLoginCallback = function (req, res, next) {
  var bcrypt = require('bcrypt'),
    property,
    config = require('../config'),
    OAuth = require('oauth').OAuth,
    oauth = new OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      config.tweetapp.twitter.consumer_key,
      config.tweetapp.twitter.consumer_secret,
      "1.0",
      config.baseUrl + "/tweetapp/login/twitter/callback",
      "HMAC-SHA1"
    );

  if (req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth_data = req.session.oauth;

    oauth.getOAuthAccessToken(
      oauth_data.token,
      oauth_data.token_secret,
      oauth_data.verifier,
      function (error, oauth_access_token, oauth_access_token_secret, results) {
        if (error) {
          console.log(error);
          res.redirect(req.session.siteUrl + '/#/login/callback');
          next(error);
        } else {
          req.session.oauth.access_token = oauth_access_token;
          req.session.oauth.access_token_secret = oauth_access_token_secret;

          var db = req.tweetappDb,
            jwt = req.jwt,
            d = new Date(),
            secs = d.getTime(),
            str = 'twitterlogin' + secs,
            hash = bcrypt.hashSync(secs.toString(), config.cookieSalt),
            profile = {},
            token,
            original_token;

          for (var property in results) {
            if (results.hasOwnProperty(property)) {
              profile[property] = results[property];
            }
          }

          for (var property in req.session.oauth) {
            if (req.session.oauth.hasOwnProperty(property)) {
              profile[property] = req.session.oauth[property];
            }
          }

          token = jwt.sign(profile, config.cookieSalt, { expiresInMinutes: 60*60*24 });
          profile.created = secs;
          original_token = profile.token;
          profile.token = token;
          profile.original_token = original_token;

          db.collection('sessions').update({'user_id': profile.user_id, 'token': profile.token}, profile, {'upsert': true}, function (err) {

            if (err) {
              console.log(err);
              res.redirect(req.session.siteUrl + '/#/login/callback');
            }

            res.redirect(req.session.siteUrl + '/#/login/callback/' + token);
          });

        }
      }
    );
  }
  else {
    res.redirect(config.tweetapp.client + '/#/login/callback'); // Redirect to login page
  }

};

/*var login = function(req, res, next) {
	var config = require('../../../config');
	var bcrypt = require('bcrypt');
	var db = req.tweetappDb;

	db.collection('users').findOne({username: req.body.username}, function(e, result){
    if (e) {
      return next(e);
    }
    else {
    	var jwt = req.jwt;
    	var hash = bcrypt.hashSync(req.body.password, config.cookieSalt);
    	var username = result.username;
    	var id = result._id;

    	bcrypt.compare(req.body.password, result.password, function(err, r) {
    		if (err) {
      		return next(err);
    		}

    		if (r === true) {
    			var d = new Date();
    			var secs = d.getTime();
    			var str = req.body.username + secs;
    			var hash = bcrypt.hashSync(secs.toString(), config.cookieSalt);
    			db.collection("sessions").insert({ "hash":hash, "userId":result._id, "access":secs }, function(e, result) {
    				if (e) {
    					return next(e);
    				}

    				var profile = {
					    username: username,
					    id: id
					  };

					  console.log(profile);

  					// We are sending the profile inside the token
  					var token = jwt.sign(profile, config.cookieSalt, { expiresInMinutes: 60*60*24 });

    				res.status(200).send( {msg: "success", "hash":hash, token:token } );
    			});
    		}
    		else {
    			res.status(401).send({ msg: "forbidden" });
    		}

			});
    }

  });
};*/

var sessionData = function(req, res, next) {
  var collectionName = 'sessions',
    response = {},
    db = req.tweetappDb,
    s = req.headers.authorization,
    token;

  if (!s) {
    response.msg = 'ERROR: no token';
    res.status(400).send(response);
  } else {
    token = s.substring(7);
    db.collection(collectionName).find({token: token}, {user_id:1, screen_name:1}).sort({"created" : -1}).limit(1).toArray(function(e, results){
      if (e) {
        return next(e);
      }
      response.msg = 'Success';
      response.data = results[0];
      res.status(200).send(response);
    });
  }
};

var userData = function (req, res, next) {
  var config = require('../config'),
    TwitterApiClient = require('../modules/TwitterApiClient'),
    client = new TwitterApiClient(config.tweetapp.twitter, req),
    db = req.tweetappDb,
    d = new Date(),
    params = {
      user_id: req.params.user_id
    };

  client.getUserData(params, function(err, user) {
    if (err) {
      return next(err);
    }

    user.last_sync = d.getTime();

    db.collection('users').update({ "id_str": req.params.user_id }, user, { upsert: true }, function(err) {
      res.status(200).send(user);
    });

  });
};

module.exports = function attachHandlers (app) {

  //app.post('/tweetapp/login', login);
  app.post('/tweetapp/login/twitter', twitterLogin);
  app.get('/tweetapp/login/twitter/callback', twitterLoginCallback);
  app.get('/tweetapp/auth/session', sessionData);
  app.get('/tweetapp/auth/user/:user_id', userData);
};
