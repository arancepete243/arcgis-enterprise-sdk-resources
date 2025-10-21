const { StatisticsFields } = require('../helpers/fields');

function renderStatisticsResponse(statistics, fieldDefinitions, requestParameters) {
  const normalizedStatistics = Array.isArray(statistics) ? statistics : [statistics];

  const features = normalizedStatistics.map((attributes) => {
    return { attributes };
  });

  const params = {
    statisticsSample: Array.isArray(statistics) ? statistics[0] : statistics,
    fieldDefinitions,
    groupByFieldsForStatistics: requestParameters.groupByFieldsForStatistics,
    outStatistics: requestParameters.outStatistics,
  };

  const fields = StatisticsFields.create(params);

  return {
    displayFieldName: '',
    fields,
    features,
  };
}

module.exports = { renderStatisticsResponse };
