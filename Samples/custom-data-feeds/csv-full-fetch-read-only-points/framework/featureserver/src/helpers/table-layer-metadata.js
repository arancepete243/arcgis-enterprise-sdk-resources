const _ = require('lodash');
const defaults = require('../metadata-defaults');

class TableLayerMetadata {
  static create(geojson, metadata, layerId) {
    const tableMetadata = new TableLayerMetadata();
    return tableMetadata.mixinOverrides(geojson, metadata, layerId);
  }

  constructor() {
    Object.assign(this, defaults.tableLayerDefaults());
  }

  mixinOverrides(geojson, metadata, layerId) {
    const {
      uniqueIdKey,
      displayField,
      capabilities,
      hasStaticData,
      supportsPagination,
      hasAttachments,
      fields,
    } = metadata;

    this.capabilities = capabilities;

    this._setFields(fields);

    this._setId(layerId);

    this._setDisplayField(displayField, uniqueIdKey);

    this._setHasStaticData(hasStaticData);

    this._setUniqueIdField(uniqueIdKey);

    this._setPagination(supportsPagination);

    this._setDirectOverrides(metadata);

    this._setHasAttachments(hasAttachments);

    return this;
  }

  _setFields(fields) {
    this.fields = fields;
  }

  _setId(layerId) {
    this.id = layerId;
  }

  _setDisplayField(displayField, idField) {
    this.displayField = displayField || idField;
  }

  _setHasStaticData(hasStaticData) {
    if (typeof hasStaticData === 'boolean') {
      this.hasStaticData = hasStaticData;
    }
  }

  _setUniqueIdField(idField) {
    this.uniqueIdField.name = idField;
  }

  _setPagination(supportsPagination) {
    if (typeof supportsPagination === 'boolean') {
      this.advancedQueryCapabilities.supportsPagination = supportsPagination;
    }
  }

  _setHasAttachments(hasAttachments) {
    if (hasAttachments != null && typeof hasAttachments === 'boolean') {
      this.hasAttachments = hasAttachments;
    }
  }

  _setDirectOverrides(metadata) {
    const {
      name,
      relationships,
      description,
      copyrightText,
      templates,
      uniqueIdKey,
      timeInfo,
      maxRecordCount,
      currentVersion,
      hasZ,
      supportsRollbackOnFailureParameter,
      allowGeometryUpdates,
      defaultVisibility,
      capabilities,
      supportedQueryFormats,
    } = metadata;

    _.merge(this, {
      name,
      relationships,
      description,
      copyrightText,
      templates,
      objectIdField: uniqueIdKey,
      timeInfo,
      maxRecordCount,
      currentVersion,
      hasZ,
      supportsRollbackOnFailureParameter,
      allowGeometryUpdates,
      defaultVisibility,
      capabilities,
      supportedQueryFormats,
    });
  }
}

module.exports = TableLayerMetadata;
