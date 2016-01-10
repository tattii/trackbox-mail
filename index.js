var express = require('express');
var app = express();
var request = require('request');

// for mail
var Mailgun = require('mailgun').Mailgun;
var mg = new Mailgun('key-03defc8cd74c81ecce7f7f3552de863c');
var email = 'trackbox0@gmail.com';

// for post params
var bodyParser = require('body-parser');
var multer = require('multer');
app.use(multer());

// for parse track file
var fs = require('fs');
var parseString = require('xml2js').parseString;

// for kmz
var unzip = require('unzip');
var tj = require('togeojson');
var jsdom = require('jsdom').jsdom;

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));


app.get('/', function(request, response) {
	response.send('this is mail incoming server...');
});


app.post('/post', function(req, res) {
	var data = req.body;
	var from = data.from;
	var title = data.subject;
	var trackData;

	try {
		// with attachment file
		if ( data['attachment-count'] > 0 ){
			var filename = req.files['attachment-1'].path;
			console.log(filename);  // DEBUG
			var filetype = filename.match(/\w+$/)[0];

			if (filetype == 'gpx'){
				trackData = parseGPX(filename);

			}else if (filetype == 'kmz'){
				trackData = parseKMZ(filename);

			}else{
				throw new Error(filetype + ' file is not supprted');
			}
		}

console.log(trackData);

		// post to trackbox
		if (trackData){
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

					returnMail(
						'航跡を共有しました - TrackBox',
						'航跡を共有しました。\n\n' +
						'「' + title + '」' + '\n' +
						'航跡へのリンク ' + url +
						'\n\n' +
						'by TrackBox'
					);

				}else{
					throw new Error('cannot post to trackbox ' + response.statusCode);
				}
			});
		}else{
			throw new Error('track data not found');
		}

	}catch(e){
		console.error(e);
		returnMail(
			'TrackBox Error',
			'Error! ' + e.message
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





app.listen(app.get('port'), function() {
	console.log('Node app is running at localhost:' + app.get('port'));
});



function parseGPX(filename){
	var xml = fs.readFileSync(filename);
	parseString(xml, function (err, result) {
		if (err) throw err;
		if (result.gpx.trk.length > 0){
			var track = [];
			var trk = result.gpx.trk[0];
			var trkpt = trk.trkseg[0].trkpt;
console.log(trk);
			trkpt.forEach(function(point){
				track.push([
					parseFloat( point.$.lat ),
					parseFloat( point.$.lon ),
					parseInt( point.ele[0] ),
					Date.parse( point.time[0] ) / 1000
				]);
			});

			return track;
		}
	});
}

function parseKMZ(filename){
	fs.readFile(filename, 'utf8', function(err, data){
		if (err) throw err;
		// decode base64
		var decoded = new Buffer(data, 'base64');
		fs.writeFile(filename + '.decoded', decoded, function(err){
			if (err) throw err;

			// unzip kmz -> kml
			fs.createReadStream(filename + '.decoded').pipe(unzip.Extract({ path: filename + '.unziped' }));

			// parse kml
			var kml = jsdom(fs.readFileSync(fileName + ".unziped/doc.kml", "utf8"));
			var converted = tj.kml(kml);

			// trackbox data
			var track = [];
			var coords = converted.features[0].geometry.coordinates;
			var times = converted.features[0].properties.coordTimes;
			
			for(var i = 0; i < coords.length; i++){
				coords[i].push(Date.parse(times[i]) / 1000);
				track.push(coords[i]);
			}

			return track;
		});
	});
}


