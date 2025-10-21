const { getDataTypeFromValue } = require('../data-type-utils');
const {
  ESRI_FIELD_TYPE_OID,
  ESRI_FIELD_TYPE_STRING,
  ESRI_FIELD_TYPE_DATE,
  ESRI_FIELD_TYPE_DOUBLE,
  SQL_TYPE_FLOAT,
  SQL_TYPE_INTEGER,
  SQL_TYPE_OTHER,
  ESRI_FIELD_TYPE_INTEGER,
  ESRI_FIELD_TYPE_BLOB,
  ESRI_FIELD_TYPE_GEOMETRY,
  ESRI_FIELD_TYPE_GLOBALID,
  ESRI_FIELD_TYPE_GUID,
  ESRI_FIELD_TYPE_RASTER,
  ESRI_FIELD_TYPE_SMALL_INTEGER,
  ESRI_FIELD_TYPE_BIG_INTEGER,
  ESRI_FIELD_TYPE_XML,
  ESRI_FIELD_TYPE_SINGLE,
} = require('./constants');

const esriTypes = [
  ESRI_FIELD_TYPE_OID,
  ESRI_FIELD_TYPE_STRING,
  ESRI_FIELD_TYPE_DATE,
  ESRI_FIELD_TYPE_DOUBLE,
  ESRI_FIELD_TYPE_INTEGER,
  ESRI_FIELD_TYPE_BLOB,
  ESRI_FIELD_TYPE_GEOMETRY,
  ESRI_FIELD_TYPE_GLOBALID,
  ESRI_FIELD_TYPE_GUID,
  ESRI_FIELD_TYPE_RASTER,
  ESRI_FIELD_TYPE_SINGLE,
  ESRI_FIELD_TYPE_SMALL_INTEGER,
  ESRI_FIELD_TYPE_BIG_INTEGER,
  ESRI_FIELD_TYPE_XML,
];

function getEsriTypeFromDefinition(typeDefinition = '') {
  return matchEsriType(typeDefinition) || matchSimpleType(typeDefinition);
}

function matchSimpleType(typeDefinition) {
  switch (typeDefinition.toLowerCase()) {
    case 'double':
    case 'number':
      return ESRI_FIELD_TYPE_DOUBLE;
    case 'integer':
      return ESRI_FIELD_TYPE_INTEGER;
    case 'date':
      return ESRI_FIELD_TYPE_DATE;
    case 'blob':
      return ESRI_FIELD_TYPE_BLOB;
    case 'geometry':
      return ESRI_FIELD_TYPE_GEOMETRY;
    case 'globalid':
      return ESRI_FIELD_TYPE_GLOBALID;
    case 'guid':
      return ESRI_FIELD_TYPE_GUID;
    case 'raster':
      return ESRI_FIELD_TYPE_RASTER;
    case 'single':
      return ESRI_FIELD_TYPE_SINGLE;
    case 'smallinteger':
      return ESRI_FIELD_TYPE_SMALL_INTEGER;
    case 'biginteger':
    case 'bigint':
      return ESRI_FIELD_TYPE_BIG_INTEGER;
    case 'xml':
      return ESRI_FIELD_TYPE_XML;
    case 'string':
    case ESRI_FIELD_TYPE_STRING:
    default:
      return ESRI_FIELD_TYPE_STRING;
  }
}

function matchEsriType(typeDefinition) {
  return esriTypes.find((esriType) => {
    return esriType.toLowerCase() === typeDefinition.toLowerCase();
  });
}

function getEsriTypeFromValue(value) {
  const dataType = getDataTypeFromValue(value);

  return getEsriTypeFromDefinition(dataType);
}

function getSqlTypeFromDefinition(typeDefinition = '') {
  switch (typeDefinition.toLowerCase()) {
    case 'double':
    case 'number':
      return SQL_TYPE_FLOAT;
    case 'integer':
      return SQL_TYPE_INTEGER;
    case 'date':
      return 'sqlTypeTimestamp2';
    case 'string':
    case 'globalid':
      return 'sqlTypeNVarchar';
    case 'smallinteger':
      return 'sqlTypeSmallInt';
    case 'biginteger':
    case 'bigint':
      return 'sqlTypeBigInt';
    default:
      return SQL_TYPE_OTHER;
  }
}

function getSqlTypeFromValue(value) {
  const dataType = getDataTypeFromValue(value);

  return getSqlTypeFromDefinition(dataType);
}

module.exports = {
  getEsriTypeFromDefinition,
  getEsriTypeFromValue,
  getSqlTypeFromDefinition,
  getSqlTypeFromValue,
};
