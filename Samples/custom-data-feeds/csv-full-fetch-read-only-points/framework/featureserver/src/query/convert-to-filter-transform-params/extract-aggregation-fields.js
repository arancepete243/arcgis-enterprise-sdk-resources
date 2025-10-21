function extractAggregateFields(outStatistics) {
  if (outStatistics) {
    const aggregates = getAggregatesFromOutStatistics(outStatistics);
    return normalizeAggregateNames(aggregates);
  }
}

function getAggregatesFromOutStatistics(outStatistics) {
  return outStatistics.map((agg) => {
    return {
      type: agg.statisticType,
      field: agg.onStatisticField,
      name: agg.outStatisticFieldName,
    };
  });
}

function normalizeAggregateNames(aggregates) {
  return aggregates.map((aggregate) => {
    const { type, field } = aggregate;
    const name = aggregate.name ? aggregate.name : `${type}_${field}`;
    return {
      name: name.replace(/\s/g, '_'),
      type,
      field,
    };
  });
}

module.exports = extractAggregateFields;
