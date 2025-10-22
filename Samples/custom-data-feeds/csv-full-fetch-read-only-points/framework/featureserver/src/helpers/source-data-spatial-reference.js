const normalizeSpatialReference = require('./normalize-spatial-reference');
const extractSridFromCrsString = require('./get-collection-crs');

function normalizeSourceDataSpatialReference({ dataCrs, crs } = {}) {
  const crsSrid = extractSridFromCrsString({ crs });

  if (!dataCrs && !crsSrid) {
    return normalizeSpatialReference({ wkid: 4326 });
  }

  const sourceDataSpatialReference = dataCrs || crsSrid;

  const spatialReference = normalizeSpatialReference(sourceDataSpatialReference);

  if (!spatialReference) {
    throw new Error(
      `source data spatial reference "${JSON.stringify(dataCrs || crs)}" could not be parsed.`,
    );
  }
  return spatialReference;
}

module.exports = normalizeSourceDataSpatialReference;
