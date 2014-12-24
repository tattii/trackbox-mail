var express = require('express');
var app = express();

var Mailgun = require('mailgun').Mailgun;
var mg = new Mailgun('key-03defc8cd74c81ecce7f7f3552de863c');


app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.send('Hello World!');
});


app.get('/post', function(req, res) {
  res.send("");
  console.log(req.param("sender"));
  console.log(req.param("attachment-x"));
});

mg.createRoute(".*?", "http://trackbox-mail.herokuapp.com/post");


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
