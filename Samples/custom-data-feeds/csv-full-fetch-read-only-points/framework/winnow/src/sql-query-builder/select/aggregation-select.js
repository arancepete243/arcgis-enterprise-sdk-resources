function createAggregationSelect(aggregates, groupBy) {
  const selector = 'properties';
  const select = `SELECT ` + aggregates.map(reduceToSelectString).join(', ');

  if (groupBy) {
    return addGroupBy(select, groupBy, selector);
  }

  return `${select} FROM ? `;
}

function reduceToSelectString(aggregation) {
  const aggregationSelectFragment = `${aggregation.type.toUpperCase()}(properties->\`${
    aggregation.field
  }\`)`;
  aggregation.name = aggregation.name
    ? aggregation.name
    : `${aggregation.type}_${aggregation.field}`;
  return `${aggregationSelectFragment} as \`${aggregation.name}\``;
}

function addGroupBy(select, groupBy, selector) {
  const fields = groupBy
    .map((group) => {
      return `${selector}->\`${group}\` as \`${group}\``;
    })
    .join(', ');

  return `${select}, ${fields} FROM ? `;
}

module.exports = createAggregationSelect;
