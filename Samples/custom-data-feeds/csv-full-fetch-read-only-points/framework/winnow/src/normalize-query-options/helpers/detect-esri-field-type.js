const _ = require('lodash');
const { isValidISODateString, isValidDate } = require('iso-datestring-validator');
const dateTimeParser = require('postgres-date');
const MAX_32_BIT_INTEGER = 2147483647;

function getDataTypeFromValue(value) {
  if (isBigInt(value)) {
    return 'BigInteger';
  }

  if (_.isNumber(value)) {
    return Number.isInteger(value) ? 'Integer' : 'Double';
  }

  if (isDate(value)) {
    return 'Date';
  }

  return 'String';
}

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

function isDate(value) {
  return (
    value instanceof Date ||
    (typeof value === 'string' &&
      !!(dateTimeParser(value) || isValidDate(value) || isValidISODate(value)))
  );
}

function isValidISODate(value) {
  // this is required due to RegExp error in in the iso-datestring-validator module
  try {
    return isValidISODateString(value);
  } catch (err) {
    if (err.message.startsWith('Invalid regular expression')) {
      return false;
    }
    throw err;
  }
}

module.exports = getDataTypeFromValue;
