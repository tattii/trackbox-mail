var express = require('express');
var app = express();
var request = require('request');

// for mail
var Mailgun = require('mailgun').Mailgun;
var mg = new Mailgun(process.env.MAILGUN_API_KEY);
var email = 'trackbox0@gmail.com';

// for post params
var bodyParser = require('body-parser');
app.use(bodyParser());
var multer = require('multer');
app.use(multer());

// for parse track file
var fs = require('fs');
var parseString = require('xml2js').parseString;

// for kmz
var unzip = require('unzip2');
var tj = require('togeojson');
var jsdom = require('jsdom').jsdom;

// for Google Drive
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	'http://www.google.co.jp'
);
oauth2Client.setCredentials({
	access_token: process.env.GOOGLE_ACCESS_TOKEN,
	refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});
oauth2Client.refreshAccessToken(function(err, tokens){
	console.log(tokens);
});
var drive = google.drive({ version: 'v2', auth: oauth2Client});

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
	response.send('this is mail incoming server...');
});

app.post('/post', function(req, res) {
	var data = req.body;
	var from = data.from;
	var title = data.subject || 'Track';
	var trackData = [];

	console.log(JSON.stringify(data, null, '  ')); // DEBUG: mail data

	try {
		// with attachment file
		if ( data['attachment-count'] > 0 ){
			var filename = req.files['attachment-1'].path;
			console.log(filename);  // DEBUG
			var filetype = filename.match(/\w+$/)[0];

			if (filetype == 'gpx'){
				parseGPX(filename, function(trackData){
					postTrackbox(trackData, title, successMail);
				});

			}else if (filetype == 'kmz'){
				parseKMZ(filename, function(trackData){
					postTrackbox(trackData, title, successMail);
				});

			}else if (filetype == 'kml'){
				parseKML(filename, function(trackData){
					postTrackbox(trackData, title, successMail);
				});

			}else{
				throw new Error(filetype + ' file is not supprted');
			}
		
		// with Google Drive Link
		}else if ( data['body-plain'].match(/drive\.google\.com/) ){
			var fileId = data['body-plain'].match(/drive\.google.com\/file\/d\/([^\/]+)\//)[1];
			console.log(fileId);  // DEBUG
			getGoogleDriveFile(fileId, function(trackData){
				postTrackbox(trackData, title, successMail);
			});


		}else{
			throw new Error('cannot find track data');
		}

	}catch(e){
		console.error(e);
		returnMail(
			'TrackBox Error',
			'Error! ' + e.message
		);
	}

	res.status(200).end();

	function returnMail(subject, message) {
		mg.sendText(
			email,
			from,
			subject,
			message
		);
	}

	function successMail(trackboxUrl){ 
		returnMail(
			'航跡を共有しました - TrackBox',
			'航跡を共有しました。\n\n' +
			'「' + title + '」' + '\n' +
			'航跡へのリンク ' + trackboxUrl +
			'\n\n' +
			'by TrackBox'
		);
	}	
});

app.listen(app.get('port'), function() {
	console.log('Node app is running at localhost:' + app.get('port'));
});



//---------------------------------------------------------
function postTrackbox(trackData, title, callback){
	if (trackData.length > 0){
		var track = {
			name: title,
			track: trackData
		};

		request.post({
			uri: 'http://trackbox.herokuapp.com/post',
			json: true,
			form: { data: JSON.stringify(track) }
		}, function(error, response, body) {
			if ( !error && response.statusCode == 200 ){
				var id = body.id;
				var url = 'http://trackbox.herokuapp.com/track/' + id;
				return callback(url);

			}else{
				throw new Error('cannot post to trackbox ' + response.statusCode);
			}
		});
	}else{
		throw new Error('track data not found');
	}
}


function parseGPX(filename, callback){
	var xml = fs.readFileSync(filename);
	parseString(xml, function (err, result) {
		if (err) throw err;
		var track = [];
		var trk = result.gpx.trk[0];
		var trkpt = trk.trkseg[0].trkpt;
		trkpt.forEach(function(point){
			track.push([
				parseFloat( point.$.lat ),
				parseFloat( point.$.lon ),
				parseInt( point.ele[0] ),
				Date.parse( point.time[0] ) / 1000
			]);
		});

		return callback(track);
	});
}

function parseKMZ(filename, callback){
	fs.readFile(filename, 'utf8', function(err, data){
		if (err) throw err;

		// unzip kmz -> kml
		var unzipExtractor = unzip.Extract({ path: filename + '.unziped' });
		unzipExtractor.on('close', function(){ parseKML(filename + '.unziped/doc.kml', callback); });
		fs.createReadStream(filename).pipe(unzipExtractor);
	});
}

function parseKML(filename, callback){
	var track = [];
	var xml = fs.readFileSync(filename, "utf8");
	var kml = jsdom(xml);
	var converted = tj.kml(kml);

	// trackbox data [lat, lon, alt, time]
	for(var f = 0; f < converted.features.length; f++){
		//console.log(JSON.stringify(converted, null, '  '));
		if (converted.features[f].geometry.type == 'LineString'){
			var coords = converted.features[f].geometry.coordinates;
			var times = converted.features[f].properties.coordTimes;

			for(var i = 0; i < coords.length; i++){
				track.push([
					coords[i][1],
					coords[i][0],
					coords[i][2],
					Date.parse(times[i]) / 1000
				]);
			}

			return callback(track);
		}
	}

	throw new Error('track data not found in kml file');
}


function getGoogleDriveFile(fileId, callback){
	var filename = '/tmp/' + fileId;
	var dest = fs.createWriteStream(filename);
	drive.files.get({
		fileId: fileId,
		alt: 'media'
	})
	.on('end', function() {
		parseKMZ(filename, callback);
	})
	.on('error', function(err) {
		throw err;
	})
	.pipe(dest);
}


