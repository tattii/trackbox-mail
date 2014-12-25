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


app.post('/post', function(req, res) {
	var data = req.body.data;
	var sender = req.param('sender');
	var from = req.param('from');
	var attachments = req.param('attachments');
	var attach0 = req.param('attachment-0');

	mg.sendText(
		"trackbox@app32823870.mailgun.org",
		"yuta.tatti@gmail.com",
		'This is the subject',
		'This is the text' + data
	);

	res.send("");
}




//mg.createRoute(".*?", "http://trackbox-mail.herokuapp.com/post");


app.listen(app.get('port'), function() {
	console.log("Node app is running at localhost:" + app.get('port'));
});
