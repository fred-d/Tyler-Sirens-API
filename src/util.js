var Promise = require('bluebird');

module.exports = {
	makeConnection: function() {
		return {
			host: process.env.RETHINK_HOST,
			port: process.env.RETHINK_PORT,
			authKey: process.env.RETHINK_KEY
		}
	},
	invoke: function(fn) {
		return function(obj) {
			return obj[fn]();
		};
	}
};
