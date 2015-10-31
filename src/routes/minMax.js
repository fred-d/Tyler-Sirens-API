/**
 * Warning: Here there be dragons. You've been warned.
 */

var r = require('rethinkdb');
var util = require('./../util.js');

module.exports = {
	method: 'GET',
	path: '/minMax',
	config: {
		cors: true
	},
	handler: function(request, response) {
		var numBuckets = 40;
		
		r.connect(util.makeConnection())
			.then(function(connection) {
				return r.db('TylerSirens')
					.table('calls')
					.filter(
						r.row('geoX')
						.eq(0)
						.not()
					)
					.map(function(val) {
						var coord = val('location').toGeojson()('coordinates');
						
						return {
							lng: coord(0), // x-coordinate
							lat: coord(1)  // y-coordinate
						};
					})
					.coerceTo('array')
					.do(function(rows) {
						return {
							maxLat: rows.max('lat')('lat'), // maximum y-coordinate
							minLat: rows.min('lat')('lat'), // minimum y-coordinate
							maxLng: rows.max('lng')('lng'), // maximum x-coordinate
							minLng: rows.min('lng')('lng')  // minimum x-coordinate
						}
					})
					.run(connection)
					.then(function(minMax) {
						var bucketWidth  = (minMax.maxLng - minMax.minLng) / numBuckets;
						var bucketHeight = (minMax.maxLat - minMax.minLat) / numBuckets;
						
						var bucketX = function(x) {
							return x.sub(minMax.minLng).div(bucketWidth).floor();
						};
						
						var bucketY = function(y) {
							return y.sub(minMax.minLat).div(bucketHeight).floor();
						};
						
						r.db('TylerSirens')
							.table('calls')
							.filter(
								r.row('geoX')
								.eq(0)
								.not()
							)
							.map(function(call) {
								var coord = call('location').toGeojson()('coordinates');
								
								return call.merge({
									bucketX: bucketX(coord(0)),
									bucketY: bucketY(coord(1))
								});
							})
							.run(connection)
							.then(util.invoke('toArray'))
							.then(function(calls) {
								connection.close();
								
								var collection = {
									type: "FeatureCollection",
									features: []
								};
								
								var buckets = calls.reduce(function(carry, call) {
									var bucketNumber = (call.bucketX * call.bucketY - 1) + call.bucketY;
									
									if (!carry.features[bucketNumber]) {
										carry.features[bucketNumber] = {
											type: "Feature",
											geometry: {
												type: "Polygon",
												coordinates: [[
													[call.bucketX * bucketWidth + minMax.minLng, call.bucketY * bucketHeight + minMax.minLat],
													[(call.bucketX + 1) * bucketWidth + minMax.minLng, call.bucketY * bucketHeight + minMax.minLat],
													[(call.bucketX + 1) * bucketWidth + minMax.minLng, (call.bucketY + 1) * bucketHeight + minMax.minLat],
													[call.bucketX * bucketWidth + minMax.minLng, (call.bucketY + 1) * bucketHeight + minMax.minLat],
													[call.bucketX * bucketWidth + minMax.minLng, call.bucketY * bucketHeight + minMax.minLat]
												]]
											},
											properties: {
												calls: []
											}
										};
									}
									
									carry.features[bucketNumber].properties.calls.push({
										'id': call.id,
										'nature': call.nature
									});
									
									return carry;
								}, collection);
								
								buckets.features = buckets.features.filter(function(cell) {
									return cell !== null;
								});
								
								response(buckets);
							});
					});
			})
	}
};
