const esriProjCodes = require('@esri/proj-codes');
const Joi = require('joi');
const wktParser = require('wkt-parser');
const logManager = require('../log-manager');
const schema = Joi.alternatives(
  Joi.string(),
  Joi.number().integer(),
  Joi.object({
    wkid: Joi.number().integer().optional(),
    latestWkid: Joi.number().integer().optional(),
    wkt: Joi.string().optional(),
  })
    .or('wkid', 'latestWkid', 'wkt')
    .unknown(),
);

function normalizeSpatialReference(input) {
  if (!input) {
    return;
  }

  const { error } = schema.validate(input);

  if (error) {
    logManager.logger.debug(`${input} is not a valid spatial reference`);
    return;
  }

  const { type, value } = parseSpatialReferenceInput(input);

  if (type === 'wkid') {
    return esriLookup(value);
  }

  return convertStringToSpatialReference(value);
}

function parseSpatialReferenceInput(spatialReference) {
  // Search input for a wkid
  if (isNumericSpatialReferenceId(spatialReference)) {
    return {
      type: 'wkid',
      value: Number(spatialReference),
    };
  }

  if (spatialReference.wkid || spatialReference.latestWkid) {
    return {
      type: 'wkid',
      value: spatialReference.latestWkid || spatialReference.wkid,
    };
  }

  return {
    type: 'wkt',
    value: spatialReference.wkt || spatialReference,
  };
}

function isNumericSpatialReferenceId(spatialReference) {
  return Number.isInteger(spatialReference) || Number.isInteger(Number(spatialReference));
}

function esriLookup(inWkid) {
  const result = esriProjCodes.lookup(inWkid);

  if (!result) {
    // Todo - throw error
    logManager.logger.debug(`unknown spatial reference detected: ${inWkid}`);
    return;
  }

  const { wkt, wkid, latestWkid } = result;

  return new SpatialReference({ wkid, wkt, latestWkid });
}

function convertStringToSpatialReference(wkt) {
  if (/WGS_1984_Web_Mercator_Auxiliary_Sphere/.test(wkt)) {
    return new SpatialReference({ wkid: 102100, latestWkid: 3857, wkt });
  }

  try {
    const wktWkid = getWktWkid(wkt);
    const esriSR = esriLookup(wktWkid);

    if (wktWkid && esriSR) {
      const { wkid, latestWkid } = esriSR;
      return new SpatialReference({
        wkt,
        wkid,
        latestWkid,
      });
    }
    return new SpatialReference({
      wkt,
    });
  } catch (err) {
    logManager.logger.debug(`un-parseable WKT spatial reference detected: ${wkt}; ${err.message}`);
    // Todo: throw error
  }
}

function getWktWkid(wkt) {
  const { AUTHORITY: authority } = wktParser(wkt);
  if (!authority) {
    return;
  }
  const [, wkid] = Object.entries(authority)[0];
  return wkid;
}

class SpatialReference {
  constructor({ wkid, latestWkid, wkt }) {
    this.wkid = wkid;
    this.latestWkid = latestWkid;
    this.wkt = wkt;
  }

  export() {
    if (this.wkid || this.latestWkid) {
      return {
        wkid: this.wkid,
        latestWkid: this.latestWkid,
      };
    }

    return {
      wkt: this.wkt,
    };
  }
}

module.exports = normalizeSpatialReference;
