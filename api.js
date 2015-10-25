var requireDir = require('require-dir');
var Hapi       = require('hapi');
var server     = new Hapi.Server();

var routes = requireDir('./src/routes');

server.connection({
	host: 'localhost',
	port: 8000
});

for (var route in routes) {
    server.route(routes[route]);
}

server.start(function() {
	console.log("Server running at: ", server.info.uri);
});
