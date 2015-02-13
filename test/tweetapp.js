var boot = require('../index').boot,
  shutdown = require('../index').shutdown,
  port = require('../index').port,
  superagent = require('superagent'),
  expect = require('expect.js'),
  baseUrl = 'http://localhost:' + port;

describe('users', function () {
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
    superagent.get(baseUrl + '/tweetapp/auth/analysis/chart/165697756')
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

  it('returns a list the number of mentions', function (done) {
    superagent.get(baseUrl + '/tweetapp/auth/tweet/mentions/165697756')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(res.body.msg).to.eql('success');
        expect(typeof res.body).to.eql('object');
        expect(typeof res.body.mentions).to.eql('object');
        expect(res.body.mentions.ninety).to.be.above(0);
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

  after(function () {
    shutdown();
  });
});