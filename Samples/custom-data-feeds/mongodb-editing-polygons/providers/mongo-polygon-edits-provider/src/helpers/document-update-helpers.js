const { DatabaseSuccess, DatabaseFailure } = require('../classes/response-classes');

async function updateMongoDocs(collection, updates) {
    // Use map to create an array of promises for each update operation
    const updatePromises = updates.map(async record => {
        let filter = { alternateID: record.properties.alternateID };
        let updateDoc = { $set: {} };

        // Tack on any non OBJECTID updated properties
        for (let key in record.properties) {
            if (key !== 'OBJECTID') {
                updateDoc.$set[key] = record.properties[key];
            }
        }

        // If there is geometry, tack on the geometry updates
        if (record.geometry) {
            let coordinatesArray = [];

            coordinatesArray = record.geometry.rings;

            if (!updateDoc.$set.location) {
                updateDoc.$set.location = {}; // Initialize location object if not already present
            }

            // Build the final update query with coordinates
            updateDoc.$set.location.type = 'Polygon';
            updateDoc.$set.location.coordinates = coordinatesArray;
        }

        // Perform the update
        const result = await collection.updateOne(filter, updateDoc);

        // Add the success or failure object to updates array based on the result
        if (result.modifiedCount === 1) {
            return new DatabaseSuccess(record.properties.alternateID);
        } else {
            return new DatabaseFailure(1019, "Internal error during object update.");
        }
    });

    // Wait for all update operations to complete
    const verifiedUpdatesArray = await Promise.all(updatePromises);

    return verifiedUpdatesArray;
}

module.exports = { updateMongoDocs };