async function insertRows(adds, dbConn, config) {
    const objectidFieldName = config.idField;
    const geometryColumnName = config.geomOutColumn;
    const tableName = config.properties.name;

    let addResults = [];

    for (const feature of adds) {
        const properties = feature.properties;
        const geometry = feature.geometry;

        // Ensure "OBJECTID" and "geometry" are not duplicated
        let columns = Object.keys(properties).filter(col => col !== `${objectidFieldName}` && col !== `${geometryColumnName}`);
        columns.push(`${objectidFieldName}`, `${geometryColumnName}`); // Ensure correct order

        // Fetch next available OBJECTID
        const objectId = await new Promise((resolve, reject) => {
            const maxsql = `SELECT COALESCE(MAX(${objectidFieldName}), 0) + 1 AS next_id FROM ${tableName};`;
            dbConn.all(maxsql, (err, row) => {
                if (err || !row || !row[0]["next_id"]) {
                    resolve(1);
                } else {
                    resolve(row[0]["next_id"]);
                }
            });
        });

        // Validate and prepare geometry
        let geomValue = null;
        if (geometry && geometry.coordinates[0] !== undefined && geometry.coordinates[1] !== undefined) {
            geomValue = `SRID=${config.dbWKID};POINT(${geometry.coordinates[0]} ${geometry.coordinates[1]})`;
        }

        // Extract values in the correct order as columns
        const values = columns.map(col => {
            if (col === `${objectidFieldName}`) return objectId;
            if (col === `${geometryColumnName}`) return `ST_GeomFromText('${geomValue}')`;
            return typeof properties[col] === "string" ? `'${properties[col].replace(/'/g, "''")}'` : properties[col];
        });

        // Prepare direct SQL query (NO placeholders)
        const insertsql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")})`;

        // Execute insert operation with error handling
        await new Promise((resolve, reject) => {
            dbConn.run(insertsql, (err) => {
                if (err) {
                    const errorresponse = {
                        "success": false,
                        "error": {
                            "code": 1017,
                            "description": `Internal error during object insert.`
                        }
                    };
                    addResults.push(errorresponse);
                    resolve(err); // allow the edits to proceed; rollback will happen later

                } else {
                    const outputresponse = {
                        "success": true,
                        "objectId": objectId
                    };
                    addResults.push(outputresponse);
                    resolve();
                }
            });
        });
    }

    return addResults;
}

module.exports = {
    insertRows
}