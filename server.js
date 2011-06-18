(function () {
	'use strict';

	var connect = require('connect'),
		fs = require('fs'),
		port = 2000,
		options = {
			key: fs.readFileSync('privatekey.pem').toString(),
			cert: fs.readFileSync('certificate.pem').toString()
		};
	
	function route(app) {
		app.get('/', function (req, res) {
			/*
			res.writeHead(401, {'WWW-Authenticate': 'Basic realm="Secure Area"'});
			res.end("I'm sorry, but your credentials were not acceptabe. Please make a sacrifice to the gods and try again");
			*/
			res.writeHead(200);

			res.end("Welcome to my domain");
		});
	}

	connect(options,
		connect.basicAuth(function (user, pass) {
			console.log('User:', user);
			console.log('Password:', pass);
			return true;
		}),
		connect.router(route)
	).listen(port, function () {
		console.log('Server listening on port ' + port);
	});
}());
