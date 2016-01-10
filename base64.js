var fs = require('fs');
var unzip = require('unzip');

fs.readFile('mail.base', 'utf8', function(err, data){
	if (err) throw err;
	var decoded = new Buffer(data, 'base64');
	console.log(decoded.toString());
	fs.writeFile('mail.base.d', decoded, function(err) {
		fs.createReadStream('mail.base.d').pipe(unzip.Extract({ path: 'mail.data' }));
	});
});
