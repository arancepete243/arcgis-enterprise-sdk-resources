const { DatabaseSuccess, InsertDatabaseFailure } = require('../classes/response-classes');

async function insertRows(sheet, adds) {
    let addsArray = [];
    for (const item of adds) {

        try {
           
            let newRow = await sheet.addRow({
                ...item.properties,
                Longitude: item.geometry.coordinates[0],
                Latitude: item.geometry.coordinates[1]
            })
            
            // the new row number is added to the response onject
            if (newRow._rowNumber) {
                const addedElement = new DatabaseSuccess(newRow._rowNumber);
                addsArray.push(addedElement);
            }
            
        } catch (error) {
            const failedElement = new InsertDatabaseFailure(1017, error.message);
            addsArray.push(failedElement);
        }
    }
      
      return addsArray;
}

module.exports = {
    insertRows
}