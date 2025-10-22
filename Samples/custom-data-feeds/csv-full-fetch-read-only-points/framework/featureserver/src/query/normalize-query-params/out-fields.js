const normalizeArray = require('../normalize-array');

function normalizeOutFields(outFields) {
  // * is Geoservices equivalent of "all fields", so set to undefined
  if (!outFields || outFields === '*') {
    return undefined;
  }

  return normalizeArray(outFields);
}

module.exports = normalizeOutFields;
