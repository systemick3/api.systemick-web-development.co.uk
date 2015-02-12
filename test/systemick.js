var boot = require('../index').boot,
  shutdown = require('../index').shutdown,
  port = require('../index').port,
  superagent = require('superagent'),
  expect = require('expect.js');

describe('systemick', function () {

  before(function () {
    boot();
  });

  describe('homepage', function(){
    it('should respond to GET',function(done){
      console.log('in homepage port is ' + port);
      superagent.get('http://localhost:'+port)
      .end(function(res){
        expect(res.status).to.equal(200);
        done();
      });
    });
  });

  describe('express rest api server', function(){

    var id,
      baseUrl = 'http://localhost:' + port;

    it('posts an object', function(done){
      superagent.post(baseUrl + '/systemick/collection/skills')
      .send({ 
        name: 'John',
        email: 'john@rpjs.co'
      })
      .end(function(e,res){
        expect(e).to.eql(null);
        expect(res.body.length).to.eql(1);
        expect(res.body[0]._id.length).to.eql(24);
        id = res.body[0]._id;
        console.log('id = ' + id);
        done();
      });
    });
 
    it('retrieves an object', function(done){
      superagent.get(baseUrl + '/systemick/collection/skills/'+id)
      .end(function(e, res){
        expect(e).to.eql(null);
        expect(typeof res.body).to.eql('object');
        expect(res.body._id.length).to.eql(24);
        expect(res.body._id).to.eql(id);
        done();
      });
    });
 
    it('retrieves a collection', function(done){
      superagent.get(baseUrl + '/systemick/collection/skills')
      .end(function(e, res){
        expect(e).to.eql(null);
        expect(res.body.length).to.be.above(0);
        expect(res.body.map(function (item){
          return item._id;
        })).to.contain(id);
        done();
      });
    });

    it('updates an object', function(done){
      superagent.put(baseUrl + '/systemick/collection/skills/'+id)
      .send({
        name: 'Peter',
        email: 'peter@yahoo.com'
      })
      .end(function(e, res){
        expect(e).to.eql(null);
        expect(typeof res.body).to.eql('object');
        expect(res.body.msg).to.eql('success');
        done();
      });
    });
 
    it('checks an updated object', function(done){
      superagent.get(baseUrl + '/systemick/collection/skills/'+id)
      .end(function(e, res){
        expect(e).to.eql(null);
        expect(typeof res.body).to.eql('object');
        expect(res.body._id.length).to.eql(24);
        expect(res.body._id).to.eql(id);
        expect(res.body.name).to.eql('Peter');
        done();
      });
    });
 
    it('removes an object', function(done){
      superagent.del(baseUrl + '/systemick/collection/skills/'+id)
      .end(function(e, res){
        expect(e).to.eql(null);
        expect(typeof res.body).to.eql('object');
        expect(res.body.msg).to.eql('success');
        done();
      });
    });

    it('retrieves tweets', function(done){
      superagent.get(baseUrl + '/twitter/user/systemick/2')
      .end(function(e, res){
        expect(e).to.eql(null);
        expect(res.status).to.eql(200);
        expect(res.body.length).to.be.above(0);
        done();
      });
    });

  });

  after(function () {
    shutdown();
  });

});