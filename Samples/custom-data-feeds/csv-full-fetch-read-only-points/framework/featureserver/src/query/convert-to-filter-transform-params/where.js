function normalizeWhere(where = '', uniqueIds, uniqueIdKey) {
  if (isEsriSelectAll(where) || where.trim() === '') {
    where = '';
  }

  where = extractPlusPlaceHolders(where);

  if (containsSqlDates(where)) {
    where = convertToISODates(where);
  }

  if (uniqueIds) {
    where = addUniqueIdFilter(uniqueIds, uniqueIdKey, where);
  }

  return where !== '' ? where : undefined;
}

function convertToISODates(where) {
  const matches = where.match(/(?!date )('?\d\d\d\d-\d\d-\d\d'?)/g);
  matches.forEach((match) => {
    where = where.replace(`date ${match}`, `'${new Date(match.toString()).toISOString()}'`);
  });
  return where;
}

function isEsriSelectAll(where) {
  return /1\s*=\s*1/.test(where);
}

function containsSqlDates(where) {
  return /(?!date )('?\d\d\d\d-\d\d-\d\d'?)/.test(where);
}

function addUniqueIdFilter(uniqueIds, idFilterField, where) {
  const inValues = uniqueIds.map((val) => {
    return isNaN(val) ? `'${val}'` : val;
  });

  const uniqueIdFilter = `${idFilterField} IN (${inValues.join(',')})`;

  if (where) {
    return `${where} AND ${uniqueIdFilter}`;
  }

  return uniqueIdFilter;
}

function extractPlusPlaceHolders(where) {
  let openDouble = false;
  let openSingle = false;
  const whereWithReplacedSingleQuotes = where.replace(/''/g, '~~xxx~~');

  const charArray = Array.from(whereWithReplacedSingleQuotes);
  return charArray
    .map((char) => {
      if (char === "'" && !openDouble) {
        openSingle = !openSingle;
      }

      if (char === '"' && !openSingle) {
        openDouble = !openDouble;
      }

      if (char === '+' && !openDouble && !openSingle) {
        return ' ';
      }
      return char;
    })
    .join('')
    .replace(/~~xxx~~/g, "''");
}
module.exports = normalizeWhere;
