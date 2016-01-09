
var fs = require('fs');
var google = require('googleapis');
var apiKey = process.env.GOOGLE_API_KEY;
var drive = google.drive({ version: 'v2', auth: apiKey});

var unzip = require('unzip');
var tj = require('togeojson');
var jsdom = require('jsdom').jsdom;

var fileName = "test.kmz";
var fileId = '0BxZW3kw0bWCrcHVFbGNUWW02Z2s';
var dest = fs.createWriteStream(fileName);
drive.files.get({
	fileId: fileId,
	alt: 'media'
})
.on('end', function() {
	console.log('Done');
	fs.createReadStream(fileName).pipe(unzip.Extract({ path: fileName + ".kml" }));
	var kml = jsdom(fs.readFileSync(fileName + ".kml/doc.kml", "utf8"));
	var converted = tj.kml(kml);
	console.log(JSON.stringify(converted, null, "  "));
})
.on('error', function(err) {
	console.log('Error during download', err);
})
.pipe(dest);
