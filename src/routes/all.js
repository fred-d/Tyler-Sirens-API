var r    = require('rethinkdb');
var util = require('./../util.js');

module.exports = {
	method: 'GET',
	path: '/all',
    config: {
        cors: true
    },
	handler: function(request, response) {
        var jsonCollection = {
            type: "FeatureCollection",
            features: []
        };
        
		r.connect(util.makeConnection())
			.then(function(connection) {
				return r.db('TylerSirens')
					.table('calls')
					.filter({nature: 'WELFARE CONCERN'})
					.map(function(loc) {
                        return {
                            type: 'Feature',
                            geometry: loc('location').toGeojson()
                        };
                    })
					.run(connection)
					.then(util.invoke('toArray'))
                    .then(function(features) {
                        jsonCollection.features = features;
                        connection.close();
                        
                        response(jsonCollection);
                    });
			});
	}
};
