const _ = require('lodash')

function Model () {}

Model.prototype.getData = function (req, callback) {
  const { domainURL, UID, layerName } = req.params;
  console.log(req.params)

  // 1. Construct the Socrata API request URL
  const url = `https://${domainURL}/resource/${UID}.geojson`

  // 2. Make the request to the remote API
  fetch(url).then(resp => {
    if (!resp.ok) {
      const status = resp.status
      const statusText = resp.statusText

      throw new Error(`Request to ${url} failed; ${status}, ${statusText}.`)

    }
    return resp.json()
  }).then(geojson => {
    // 4. Create Metadata
    const geometryType = _.get(geojson, 'features[0].geometry.type', 'Point')
    geojson.metadata = { geometryType }
    geojson.metadata = { name: layerName || 'Socrata' }
    // 5. Fire callback
    callback(null, geojson)
  })
  // 6. Handle any errors
    .catch(callback)
}

module.exports = Model