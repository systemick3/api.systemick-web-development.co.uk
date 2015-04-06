var boot = require('../index').boot,
  shutdown = require('../index').shutdown,
  port = require('../index').port,
  superagent = require('superagent'),
  expect = require('expect.js'),
  baseUrl = 'http://localhost:' + port;

describe('tweets', function () {
  before(function () {
    boot();
  });

  it('retrieves tweets', function(done) {
    superagent.get(baseUrl + '/tweetapp/auth/tweet/user/systemick/10')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(typeof res.body).to.eql('object');
        expect(Array.isArray(res.body)).to.eql(true);
        expect(res.body.length).to.eql(10);
        done();
      });
  });

  it('retrieves a tweet', function (done) {
    superagent.get(baseUrl + '/tweetapp/auth/tweet/one/547677358036385792')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(typeof res.body).to.eql('object');
        expect(res.body.id_str).to.eql('547677358036385792');
        done();
      });
  });

  it('returns user analysis', function (done) {
    this.timeout(5000);
    superagent.get(baseUrl + '/tweetapp/auth/analysis/user/165697756')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(res.body.msg).to.eql('success');
        expect(typeof res.body).to.eql('object');
        expect(res.body.analysis.date.length).to.eql(10);
        expect(typeof res.body.analysis.ninety).to.eql('object');
        done();
      });
  });

  it('return multiple analyses', function (done) {
    superagent.get(baseUrl + '/tweetapp/auth/analysis/chart/165697756/10')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(res.body.msg).to.eql('success');
        expect(typeof res.body).to.eql('object');
        expect(Array.isArray(res.body.data)).to.eql(true);
        expect(res.body.data[0].date.length).to.eql(10);
        done();
      });
  });

  it('gets a list of retweets', function (done) {
    superagent.get(baseUrl + '/tweetapp/auth/tweet/retweeters/563713812675964928')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(res.body.msg).to.eql('success');
        expect(typeof res.body).to.eql('object');
        expect(Array.isArray(res.body.retweeters)).to.eql(true);
        expect(res.body.retweeters.length).to.above(0);
        done();
      });
  });

  it('returns a list of replies', function (done) {
    superagent.get(baseUrl + '/tweetapp/auth/tweet/replies/165697756/563444114730270720')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(res.body.msg).to.eql('success');
        expect(typeof res.body).to.eql('object');
        expect(Array.isArray(res.body.replies)).to.eql(true);
        done();
      });
  });

  it('gets a list of trending hashtags', function (done) {
    superagent.get(baseUrl + '/tweetapp/auth/tweet/trends')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(res.body.msg).to.eql('success');
        expect(typeof res.body).to.eql('object');
        expect(Array.isArray(res.body.data)).to.eql(true);
        done();
      });
  });

  it('gets sentiment for a tweet', function (done) {
    superagent.get(baseUrl + '/tweetapp/auth/tweet/sentiment/563444114730270720')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(res.body.msg).to.eql('success');
        expect(typeof res.body).to.eql('object');
        expect(typeof res.body.sentiment).to.eql('object');
        expect(Array.isArray(res.body.sentiment.tokens)).to.eql(true);
        done();
      });
  });

  var destroyOriginalTweetId;

  it('posts a status update', function (done) {
    superagent.post(baseUrl + '/tweetapp/auth/tweet/new')
      .send({'message': 'Hello World', 'userId': '165697756'})
      .end(function (e, res) {
        destroyOriginalTweetId = res.body.tweet.id_str;
        expect(e).to.eql(null);
        expect(res.status).to.eql(201);
        expect(res.body.msg).to.eql('Success');
        expect(typeof res.body.tweet).to.eql('object');
        done();
      });
  });

  it('favourites a status update', function (done) {
    superagent.post(baseUrl + '/tweetapp/auth/tweet/favourite')
      .send({'tweetId': destroyOriginalTweetId, 'userId': '165697756'})
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(201);
        expect(res.body.msg).to.eql('Success');
        done();
      });
  });

  it('unfavourites a status update', function (done) {
    superagent.post(baseUrl + '/tweetapp/auth/tweet/unfavourite')
      .send({'tweetId': destroyOriginalTweetId, 'userId': '165697756'})
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(201);
        expect(res.body.msg).to.eql('Success');
        done();
      });
  });

  var retweetId = '584991805508296704';
  var destroyRetweetId;

  it('retweets a tweet', function (done) {
    superagent.post(baseUrl + '/tweetapp/auth/tweet/retweet')
      .send({'tweetId': retweetId, 'userId': '165697756'})
      .end(function (e, res) {
        destroyRetweetId = res.body.tweet.id_str;
        expect(e).to.eql(null);
        expect(res.status).to.eql(201);
        expect(res.body.msg).to.eql('Success');
        expect(typeof res.body.tweet).to.eql('object');
        done();
      });
  });

  it('destroys a retweet', function (done) {
    superagent.post(baseUrl + '/tweetapp/auth/tweet/destroy')
      .send({'tweetId': destroyRetweetId, 'userId': '165697756'})
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(201);
        expect(res.body.msg).to.eql('Success');
        done();
      });
  });

  var replyId;

  it('posts a reply to an update', function (done) {
    superagent.post(baseUrl + '/tweetapp/auth/tweet/reply')
      .send({'message': 'Hello there', 'userId': '165697756', 'in_reply_to_status_id': destroyOriginalTweetId})
      .end(function (e, res) {
        replyId = res.body.tweet.id_str;
        expect(e).to.eql(null);
        expect(res.status).to.eql(201);
        expect(res.body.msg).to.eql('Success');
        expect(typeof res.body.tweet).to.eql('object');
        done();
      });
  });

  it('destroys a reply', function (done) {
    superagent.post(baseUrl + '/tweetapp/auth/tweet/destroy')
      .send({'tweetId': replyId, 'userId': '165697756'})
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(201);
        expect(res.body.msg).to.eql('Success');
        done();
      });
  });

  it('destroys a status update', function (done) {
    superagent.post(baseUrl + '/tweetapp/auth/tweet/destroy')
      .send({'tweetId': destroyOriginalTweetId, 'userId': '165697756'})
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(201);
        expect(res.body.msg).to.eql('Success');
        done();
      });
  });

  after(function () {
    shutdown();
  });
});