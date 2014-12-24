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


	mg.sendText(
		"trackbox.link@app32823870.mailgun.org",
		"yuta.tatti@gmail.com",
		'This is the subject',
		'This is the text',
	);

	res.send("");
});




mg.createRoute(".*?", "http://trackbox-mail.herokuapp.com/post");


app.listen(app.get('port'), function() {
	console.log("Node app is running at localhost:" + app.get('port'));
});
