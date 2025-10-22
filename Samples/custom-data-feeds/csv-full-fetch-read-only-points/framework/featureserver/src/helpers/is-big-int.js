const _ = require('lodash');
const MAX_32_BIT_INTEGER = 2147483647;

function isBigInt(value) {
  if (
    typeof value === 'bigint' ||
    (_.isNumber(value) &&
      Number.isInteger(value) &&
      (value > MAX_32_BIT_INTEGER || value < -1 * MAX_32_BIT_INTEGER))
  ) {
    return true;
  }
  return false;
}

module.exports = { isBigInt };
