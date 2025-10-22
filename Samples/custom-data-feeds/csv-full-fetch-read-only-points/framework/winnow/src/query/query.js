const { filterAndTransform } = require('../filter-and-transform');
const { createSqlString, createSqlParams } = require('../sql-query-builder');
//const classificationQuery = require('./classification-query');

module.exports = function (features, parameters) {
  // const { aggregates, classification } = parameters;
  const sqlStatement = createSqlString(parameters);

  // move this to classify
  // if (classification) {
  //   return classificationQuery(features, sqlStatement, parameters);
  // }

  const params = createSqlParams(features, parameters);
  return filterAndTransform(sqlStatement, params);
};
