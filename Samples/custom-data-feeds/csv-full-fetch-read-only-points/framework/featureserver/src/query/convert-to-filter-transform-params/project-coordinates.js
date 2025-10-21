const proj4 = require('proj4');
const _ = require('lodash');
const transformCoordinates = require('./transform-coordinates');

module.exports = function projectCoordinates(params) {
  const { coordinates, fromSR = 'EPSG:4326', toSR } = params;

  if (!toSR || fromSR === toSR) {
    return coordinates;
  }

  return transformCoordinates(coordinates, { fromSR, toSR }, (cbCoords, options) => {
    if (_.isNumber(cbCoords[0]) && _.isNumber(cbCoords[1])) {
      return proj4(options.fromSR, options.toSR, cbCoords);
    }
    return cbCoords;
  });
};
