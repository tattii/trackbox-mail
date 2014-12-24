var express = require('express');
var app = express();
var pg = require('pg');
var Mailgun = require('mailgun').Mailgun;
var mg = new Mailgun('key-03defc8cd74c81ecce7f7f3552de863c');


app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.send('Hello World!');
});


app.get('/post', function(req, res) {
  var data = req.param();
  
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			client.query('INSERT INTO test (id, data) VALUES ($1, $2)', ["test0001", data], function(err, result) {
				done();
				if (err) {
					console.error(err);
					res.send("Error " + err);
				}else{
					res.send({ id: id });
				}
			});
	});

  res.send("");
});




mg.createRoute(".*?", "http://trackbox-mail.herokuapp.com/post");


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
