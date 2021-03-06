var express = require('express');
var app = express();
var request = require('request');

// for mail
var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
var sghelper = require('sendgrid').mail;
var email = 'trackbox0@gmail.com';

// for post params
var bodyParser = require('body-parser');
app.use(bodyParser());
var multer = require('multer');
app.use(multer());

// for parsing tracks
var fs = require('fs');
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
		var from_email = new sghelper.Email(email);
		var to_email = new sghelper.Email(from);
		var content = new sghelper.Content('text/plain', message);
		var mail = new sghelper.Mail(from_email, subject, to_email, content);

		var request = sg.emptyRequest({
			method: 'POST',
			path: '/v3/mail/send',
			body: mail.toJSON(),
		});

		sg.API(request, function(error, response) {
			console.log(response.statusCode);
			console.log(response.body);
			console.log(response.headers);
		});
	}

	function successMail(data){ 
		returnMail(
			'航跡を共有しました - TrackBox',
			'航跡を共有しました。\n\n' +
			'「' + title + '」' + '\n\n' +
			'公開用リンク ' + 'https://track-box.github.io/track/#' + data.id + '\n\n' +
			'編集用リンク ' + 'https://track-box.github.io/edit/#' + data.edit_id + '\n\n' +
			'\n\n' +
			'by TrackBox v2'
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
			uri: 'http://trackbox2.herokuapp.com/post',
			json: true,
			form: { data: JSON.stringify(track) }
		}, function(error, response, body) {
			if ( !error && response.statusCode == 200 ){
				return callback(body);

			}else{
				throw new Error('cannot post to trackbox ' + response.statusCode);
			}
		});
	}else{
		throw new Error('track data not found');
	}
}


function parseGPX(filename, callback){
	var xml = fs.readFileSync(filename, "utf8");
	var kml = jsdom(xml);
	var converted = tj.gpx(kml);

	parseGeoJson(converted, callback);
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
	var xml = fs.readFileSync(filename, "utf8");
	var kml = jsdom(xml);
	var converted = tj.kml(kml);

	parseGeoJson(converted, callback);
}

function parseGeoJson(converted, callback){
	// trackbox data [lat, lon, alt, time]
	var track = [];

	for(var f = 0; f < converted.features.length; f++){
		//console.log(JSON.stringify(converted, null, '  '));
		if (converted.features[f].geometry.type == 'LineString'){
			var coords = converted.features[f].geometry.coordinates;
			var times = converted.features[f].properties.coordTimes;

			for(var i = 0; i < coords.length; i++){
				track.push([
					coords[i][1],
					coords[i][0],
					parseInt( coords[i][2] ),
					Date.parse(times[i]) / 1000
				]);
			}
			return callback(track);

		}else if (converted.features[f].geometry.type == 'GeometryCollection'){
			var geometries = converted.features[f].geometry.geometries;

			for(var g = 0; g < geometries.length; g++){
				var coords = geometries[g].coordinates;
				var times = converted.features[f].properties.coordTimes[g];

				for(var i = 0; i < coords.length; i++){
					track.push([
						coords[i][1],
						coords[i][0],
						parseInt( coords[i][2] ),
						Date.parse(times[i]) / 1000
					]);
				}
			}
			return callback(track);

		}else if (converted.features[f].geometry.type == 'MultiLineString'){
			var coordinates = converted.features[f].geometry.coordinates;

			for(var c = 0; c < coordinates.length; c++){
				var coords = coordinates[c];
				var times = converted.features[f].properties.coordTimes[c];

				for(var i = 0; i < coords.length; i++){
					track.push([
						coords[i][1],
						coords[i][0],
						coords[i][2],
						Date.parse(times[i]) / 1000
					]);
				}
			}
			return callback(track);
		}
	}

	throw new Error('track data not found in the file');
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


