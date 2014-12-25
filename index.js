var express = require('express');
var app = express();

// for mail
var Mailgun = require('mailgun').Mailgun;
var mg = new Mailgun('key-03defc8cd74c81ecce7f7f3552de863c');

// for post params
var bodyParser = require('body-parser');
var multer = require('multer');
app.use(multer());

// for parse track file
var fs = require('fs');
var parseString = require('xml2js').parseString;/app.use(bodyParser.json());

var email = "trackbox0@gmail.com";



app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
	response.send('Hello World!');
});


app.post('/post', function(req, res) {
	var data = req.body;
	var from = data.from;

	if ( data['attachment-count'] > 0 ){
		var xml = fs.readFileSync(req.files['attachment-1'].path);

		parseString(xml, function (err, result) {


			mg.sendText(
				email,
				from,
				'This is the subject',
				'This is the text' + JSON.stringiy(result)
			);
		});


	}else{
		mg.sendText(
			email,
			from,
			'This is the subject',
			'file not found'
		);
	}

	res.status(200).end();
});




//mg.createRoute(".*?", "http://trackbox-mail.herokuapp.com/post");


app.listen(app.get('port'), function() {
	console.log("Node app is running at localhost:" + app.get('port'));
});



function parseGPX(gpx){
	var track = [];

	if ( $(gpx).find("trkpt").length == 0 ){
		alert("ファイルを読み込めません。");
		return;

	}else{

		$(gpx).find("trkpt").each(function() {
			var altitude = parseInt( $(this).find("ele").text() );
			min_alt = (min_alt == undefined) ? altitude : (min_alt > altitude) ? altitude : min_alt;
			max_alt = (max_alt == undefined) ? altitude : (max_alt < altitude) ? altitude : max_alt;
			var time = Date.parse( $(this).find("time").text() );

			track.push({
				lat: parseFloat( $(this).attr("lat")),
				lng: parseFloat( $(this).attr("lon") ),
				altitude: altitude,
				time: time
			});

		});

		drawPath(min_alt, max_alt);
	}
}


