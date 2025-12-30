const { DatabaseSuccess, DatabaseFailure } = require('../classes/response-classes');
const ERROR_MSG = require('../constants/error-strings.json');
const CONSTANTS = require('../constants/constants.json');

async function updateRows(sheet, updates) {
    let updatesArray = [];

    const rows = await sheet.getRows();
    for (const item of updates) {
        try {
          
            // check if the requested OBJECTID is greater than the number of rows or less than 2
            // we want to return custom message for not found since our Sheets API wrapper won't
            if ( item.properties.RowID < CONSTANTS.INDEX_OFFSET || item.properties.RowID > rows[rows.length -1]._rowNumber) {
                const addedElement = new DatabaseFailure(item.properties.OBJECTID, 1019, ERROR_MSG.NOT_UPDATED_OR_DOESNT_EXIST);
                updatesArray.push(addedElement);

            } else {
                // applyEdits spec allows for partial updates to features, so we just update what is requested, not a whole feature
                Object.entries(item.properties).forEach(([key, value]) => {
                    if (key !== 'RowID') {
                      rows[item.properties.RowID - CONSTANTS.INDEX_OFFSET].set(key, value);
                    }
                });

                // check separately if geometry is being updated for the feature
                if (item.coordinates) {
                 
                  rows[item.properties.RowID - CONSTANTS.INDEX_OFFSET].set('Longitude', item.coordinates.x);
                  rows[item.properties.RowID - CONSTANTS.INDEX_OFFSET].set('Latitude', item.coordinates.y);
                
                }
                // save the commited change and update the response object  
                await rows[item.properties.RowID - CONSTANTS.INDEX_OFFSET].save();
                const addedElement = new DatabaseSuccess(item.properties.RowID);
                updatesArray.push(addedElement);
            }
            
        } catch (error) {
            const failedElement = new DatabaseFailure(item.properties.OBJECTID, 1019, error.message);
            updatesArray.push(failedElement); 
        }
      }

      return updatesArray;
}

module.exports = {
    updateRows
}