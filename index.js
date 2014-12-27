var express = require('express');
var app = express();
var request = require('request');

// for mail
var Mailgun = require('mailgun').Mailgun;
var mg = new Mailgun('key-03defc8cd74c81ecce7f7f3552de863c');
var email = "trackbox0@gmail.com";

// for post params
var bodyParser = require('body-parser');
var multer = require('multer');
app.use(multer());

// for parse track file
var fs = require('fs');
var parseString = require('xml2js').parseString;


app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));


app.get('/', function(request, response) {
	response.send('this is mail incoming server...');
});


app.post('/post', function(req, res) {
	var data = req.body;
	var from = data.from;

	if ( data['attachment-count'] > 0 ){
		var xml = fs.readFileSync(req.files['attachment-1'].path);

		parseString(xml, function (err, result) {
			var parsed = parseGPX(result);
			
			request.post({
				uri: "http://trackbox.herokuapp.com/post",
				json: true,
				form: { data: JSON.stringify(parsed) }
			}, function(error, response, body) {
				if ( !error && response.statusCode == 200 ){
					returnMail(
						"TrackBox Post test",
						JSON.stringify(body)
					);

				}else{
					returnMail(
						"TrackBox error",
						"error: cannot post to trackbox " + response.statusCode
					);
				}
			});

		});


	}else{
		returnMail(
			"TrackBox error",
			"error: file not found"
		);
	}

	function returnMail(subject, message) {
		mg.sendText(
			email,
			from,
			subject,
			message
		);
	}

	res.status(200).end();
});





//mg.createRoute(".*?", "http://trackbox-mail.herokuapp.com/post");


app.listen(app.get('port'), function() {
	console.log("Node app is running at localhost:" + app.get('port'));
});



function parseGPX(gpx){
	if ( gpx.gpx.trk.length > 0 ){
		var track = [];
		var trk = gpx.gpx.trk[0];
		var name = trk.name;
		var trkpt = trk.trkseg[0].trkpt;

		trkpt.forEach(function(point){
			track.push([
				parseFloat( point.$.lat ),
				parseFloat( point.$.lon ),
				parseInt( point.ele[0] ),
				Date.parse( point.time[0] ) / 1000
			]);
		});

		return {
			name: name,
			track: track
		};
	}
}


