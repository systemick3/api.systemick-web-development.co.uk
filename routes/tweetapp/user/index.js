exports.testUser = function (req, res, next) {
	var config = require('../../../config');

	var bcrypt = require('bcrypt');
	var hash = bcrypt.hashSync('123456789', config.pwSalt);
	res.send({ message:"Hello world " });
}

exports.twitterLogin = function (req, res, next) {
	var config = require('../../../config');
	var OAuth = require('oauth').OAuth
  , oauth = new OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      config.tweetapp.twitter.consumer_key,
      config.tweetapp.twitter.consumer_secret,
      "1.0",
      config.baseUrl + "/tweetapp/login/twitter/callback",
      "HMAC-SHA1"
    );

  oauth.getOAuthRequestToken(function (error, oauth_token, oauth_token_secret, results) {
    if (error) {
      console.log(error);
      res.send("Authentication Failed!");
    }
    else {
      req.session.oauth = {
        token: oauth_token,
        token_secret: oauth_token_secret
      };
      
      res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token)
    }
  });
};

exports.twitterLoginCallback = function(req, res, next) {
  console.log('twitterLoginCallback');

  var bcrypt = require('bcrypt');

	var config = require('../../../config');
	var OAuth = require('oauth').OAuth
  , oauth = new OAuth(
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
      function(error, oauth_access_token, oauth_access_token_secret, results) {
        if (error) {
          console.log(error);
          res.redirect('http://twitterapp.localhost/#/login/callback');
        }
        else {
          req.session.oauth.access_token = oauth_access_token;
          req.session.oauth.access_token_secret = oauth_access_token_secret;

          var db = req.tweetappDb;
          var jwt = req.jwt;
          var d = new Date();
          var secs = d.getTime();
          var str = 'twitterlogin' + secs;
          var hash = bcrypt.hashSync(secs.toString(), config.cookieSalt);
          var profile = {};

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

          var token = jwt.sign(profile, config.cookieSalt, { expiresInMinutes: 60*60*24 });
          profile.created = secs;
          var original_token = profile.token;
          profile.token = token;
          profile.original_token = original_token;

          db.collection("sessions").insert(profile, function(e, result) {

            if (e) {
              console.log(e);
              res.redirect('http://twitterapp.localhost/#/login/callback');
            }

            res.redirect('http://twitterapp.localhost/#/login/callback/' + token);
          });

        }
      }
    );
  }
  else {
    res.redirect('http://twitterapp.localhost/#/login/callback'); // Redirect to login page
  }

};

/*exports.login = function(req, res, next) {
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

exports.sessionData = function(req, res, next) {
  var collectionName = 'sessions';
  var db = req.tweetappDb;
  var s = req.headers.authorization;
  var token = s.substring(7);

  db.collection(collectionName).findOne({token: token}, {user_id:1, screen_name:1}, function(e, result){
    if (e) {
      return next(e);
    }
    res.status(200).send(result);
  });
};

exports.userData = function (req, res, next) {
  var config = require('../../../config');
  var TwitterApiClient = require('../../../modules/TwitterApiClient');
  var client = new TwitterApiClient(config.tweetapp.twitter, req);
  var db = req.tweetappDb;
  var params = {
    user_id: req.params.user_id
  };

  client.getUserData(params, function(err, data) {
    if (err) {
      return next(err);
    }

    db.collection('users').update({ "id": req.params.user_id }, data, { upsert: true }, function(err) {
      res.status(200).send(data);
    });

  });
};

var createUserSession = function(db, config, username) {
  
};