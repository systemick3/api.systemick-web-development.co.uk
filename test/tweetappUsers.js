var boot = require('../index').boot,
  shutdown = require('../index').shutdown,
  port = require('../index').port,
  superagent = require('superagent'),
  expect = require('expect.js'),
  baseUrl = 'http://localhost:' + port;

var token = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiMTY1Njk3NzU2Iiwic2NyZWVuX25hbWUiOiJzeXN0ZW1pY2siLCJ0b2tlbiI6Im9EZXdDaGsxZUF1bHl5T0xOOGpicTdacUh1QnpJd0NLIiwidG9rZW5fc2VjcmV0IjoiTjNiZ3ZFcTRqZGZPd0Q1MUVEZjFvNGZpckpPODl6Y1MiLCJ2ZXJpZmllciI6IlVudjYyWmtST21YY2NQbktsSmtTajVhd3dTSEFrOEczIiwiYWNjZXNzX3Rva2VuIjoiMTY1Njk3NzU2LUxYWjE5U0dLTEpKdEdWZUJzdTdQYVM3a1V6SGtjaWRLNHJmSG5MUzAiLCJhY2Nlc3NfdG9rZW5fc2VjcmV0IjoiVDN5MVZYWWVpTlZsTUxmajluejVidzBkMTNadWw5R3hCUzl2ckdqVEhFQTdVIiwiaWF0IjoxNDIyNzEwNDMxLCJleHAiOjE0Mjc4OTQ0MzF9.4LwdiB29zAvYMt4VhaSRyxj7lb9db-AnWV7emn_2dy8'

describe('users', function () {

  before(function () {
    boot();
  });

  // it('redirects to twitter login page', function (done) {
  //   superagent.post(baseUrl + '/tweetapp/login/twitter')
  //     .send({

  //     })
  //     .end(function(e,res) {
  //       //this.timeout(5000);
  //       //expect(e).to.eql(null);
  //       expect(res.status).to.eql(302);
  //       res.header['location'].should.include('twitter')
  //       //done();
  //     });

  //  });

  it('returns session data', function (done) {
    superagent.get(baseUrl + '/tweetapp/auth/session')
      .set('authorization', token)
      .end(function (e, res) {
        //this.timeout(5000);
        expect(res.status).to.eql(200);
        expect(typeof res.body).to.eql('object');
        expect(e).to.eql(null);
        done();
      });
  });

  it('returns user data', function () {
    superagent.get(baseUrl + '/tweetapp/auth/user/165697756')
      .end(function (e, res) {
        expect(e).to.eql(null);
        expect(typeof res.body).to.eql('object');
        expect(res.body.screen_name).to.eql('systemick');
        console.log(res.body);
        done();
      });
  });

  after(function () {
    shutdown();
  });
});