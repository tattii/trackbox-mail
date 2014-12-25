var express = require('express');
var app = express();

// for mail
var Mailgun = require('mailgun').Mailgun;
var mg = new Mailgun('key-03defc8cd74c81ecce7f7f3552de863c');

// for post params
var bodyParser = require('body-parser');
var multer = require('multer');
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());


app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
	response.send('Hello World!');
});


app.post('/post', function(req, res) {
	var data = req.body;

	mg.sendText(
		"trackbox@app32823870.mailgun.org",
		"yuta.tatti@gmail.com",
		'This is the subject',
		'This is the text' + JSON.stringify(req.files)
	);

	res.status(200).end();
});




//mg.createRoute(".*?", "http://trackbox-mail.herokuapp.com/post");


app.listen(app.get('port'), function() {
	console.log("Node app is running at localhost:" + app.get('port'));
});
