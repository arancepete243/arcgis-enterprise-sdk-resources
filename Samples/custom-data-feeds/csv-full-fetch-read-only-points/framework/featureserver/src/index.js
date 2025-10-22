const { setLogger } = require('./log-manager.js');
const defaults = require('./metadata-defaults.js');
const { transformApplyEditsInput } = require('./transform-apply-edits-input.js');
const {
  validateLayerApplyEdits,
  validateServerApplyEdits,
} = require('./validate-apply-edits-body.js');

module.exports = {
  serverInfo: require('./server-info-route-handler.js'),
  layerInfo: require('./layer-info-handler.js'),
  layersInfo: require('./layers-info-handler.js'),
  query: require('./query/index.js'),
  generateRenderer: require('./generate-renderer/index.js'),
  setLogger,
  setDefaults: defaults.setDefaults.bind(defaults),
  transformApplyEditsInput,
  validateLayerApplyEdits,
  validateServerApplyEdits,
};
