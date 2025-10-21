const joi = require('joi');
const _ = require('lodash');
const CURRENT_VERSION = 12.0;
const FULL_VERSION = '12.0.0';
const MAX_RECORD_COUNT = 2000;
const SERVICE_DESCRIPTION = 'A feature service powered by Custom Data Feeds.';
const LAYER_DESCRIPTION = 'A feature layer powered by Custom Data Feeds.';
const COPYRIGHT = 'Copyright information varies by provider. Contact the source of this data.';
const SPATIAL_REFERENCE = {
  wkid: 4326,
  latestWkid: 4326,
};
const EXTENT = {
  xmin: -180,
  ymin: -90,
  xmax: 180,
  ymax: 90,
  spatialReference: SPATIAL_REFERENCE,
};
const SUPPORTED_QUERY_FORMATS = 'JSON,geojson,PBF';

const defaultOverridables = {
  currentVersion: CURRENT_VERSION,
  fullVersion: FULL_VERSION,
  maxRecordCount: MAX_RECORD_COUNT,
  server: {
    serviceDescription: SERVICE_DESCRIPTION,
    description: SERVICE_DESCRIPTION,
    copyrightText: COPYRIGHT,
  },
  layer: {
    description: LAYER_DESCRIPTION,
    copyrightText: COPYRIGHT,
    supportedQueryFormats: SUPPORTED_QUERY_FORMATS,
  },
};

const overridablesSchema = joi.object({
  currentVersion: joi.number(),
  fullVersion: joi.string(),
  server: joi.object({
    serviceDescription: joi.string().allow(null, ''),
    description: joi.string().allow(null, ''),
    copyrightText: joi.string().allow(null, ''),
  }),
  layer: joi.object({
    description: joi.string().allow(null, ''),
    copyrightText: joi.string().allow(null, ''),
    supportedQueryFormats: joi.string().allow('JSON', 'JSON,geojson'),
  }),
});

class MetadataDefaults {
  #overridables;
  constructor() {
    this.#overridables = _.cloneDeep(defaultOverridables);
  }

  serverDefaults() {
    return {
      currentVersion: this.#overridables.currentVersion,
      serviceDescription: this.#overridables.server.serviceDescription,
      hasVersionedData: false,
      supportsDisconnectedEditing: false,
      hasStaticData: false,
      hasSharedDomains: false,
      maxRecordCount: MAX_RECORD_COUNT,
      supportedQueryFormats: 'JSON',
      supportsVCSProjection: false,
      supportedExportFormats: '',
      capabilities: 'Query',
      allowGeometryUpdates: true,
      description: this.#overridables.server.description,
      copyrightText: this.#overridables.server.copyrightText,
      spatialReference: SPATIAL_REFERENCE,
      fullExtent: EXTENT,
      initialExtent: EXTENT,
      units: 'esriDecimalDegrees',
      supportsAppend: false,
      supportsSharedDomains: false,
      supportsWebHooks: false,
      supportsTemporalLayers: false,
      layerOverridesEnabled: false,
      syncEnabled: false,
      supportsApplyEditsWithGlobalIds: false,
      supportsReturnDeleteResults: false,
      supportsLayerOverrides: false,
      supportsTilesAndBasicQueriesMode: true,
      supportsQueryContingentValues: false,
      supportedContingentValuesFormats: '',
      supportsContingentValuesJson: null,
      tables: [],
      layers: [],
    };
  }

  tableLayerDefaults() {
    return {
      currentVersion: this.#overridables.currentVersion,
      id: 0,
      name: 'Not Set',
      type: 'Table',
      displayField: '',
      description: this.#overridables.layer.description,
      copyrightText: this.#overridables.layer.copyrightText,
      capabilities: 'Query',
      allowGeometryUpdates: true,
      defaultVisibility: true,
      isDataVersioned: false,
      hasContingentValuesDefinition: false,
      supportsAppend: false,
      supportsCalculate: false,
      supportsASyncCalculate: false,
      supportsTruncate: false,
      supportsAttachmentsByUploadId: false,
      supportsAttachmentsResizing: false,
      supportsRollbackOnFailureParameter: false,
      supportsStatistics: true,
      supportsExceedsLimitStatistics: false,
      supportsAdvancedQueries: true,
      supportsValidateSql: false,
      supportsLayerOverrides: false,
      supportsTilesAndBasicQueriesMode: true,
      supportsFieldDescriptionProperty: false,
      supportsQuantizationEditMode: false,
      supportsApplyEditsWithGlobalIds: false,
      supportsReturningQueryGeometry: false,
      supportedPbfFeatureEncodings: 'esriDefault',
      advancedQueryCapabilities: {
        supportsPagination: true,
        supportsQueryAttachmentsCountOnly: false,
        supportsPaginationOnAggregatedQueries: false,
        supportsQueryRelatedPagination: false,
        supportsQueryWithDistance: false,
        supportsReturningQueryExtent: true,
        supportsStatistics: true,
        supportsOrderBy: true,
        supportsDistinct: true,
        supportsQueryWithResultType: false,
        supportsSqlExpression: false,
        supportsAdvancedQueryRelated: false,
        supportsCountDistinct: false,
        supportsPercentileStatistics: false,

        supportedSpatialAggregationStatistics: [],
        supportsLod: false,
        supportsQueryWithLodSR: false,
        supportedLodTypes: [],
        supportsReturningGeometryCentroid: false,
        supportsReturningGeometryEnvelope: false,
        supportsQueryWithDatumTransformation: false,
        supportsCurrentUserQueries: false,
        supportsHavingClause: false,
        supportsOutFieldSQLExpression: false,
        supportsMaxRecordCountFactor: false,
        supportsTopFeaturesQuery: false,
        supportsDisjointSpatialRel: false,
        supportsQueryWithCacheHint: false,
        supportedOperationsWithCacheHint: [],
        supportsQueryAnalytic: false,
        supportsDefaultSR: false,
        supportsFullTextSearch: false,
        advancedQueryAnalyticCapabilities: {},
        advancedEditingCapabilities: {},
      },
      useStandardizedQueries: true,
      hasAttachments: false,
      htmlPopupType: 'esriServerHTMLPopupTypeNone',
      hasM: false,
      hasZ: false,
      objectIdField: 'OBJECTID',
      uniqueIdField: {
        name: 'OBJECTID',
        isSystemMaintained: true,
      },
      globalIdField: '',
      typeIdField: '',
      dateFieldsTimeReference: {
        timeZone: 'UTC',
        respectsDaylightSaving: false,
      },
      preferredTimeReference: null,
      templates: [
        {
          name: 'Edit Template',
          description: 'Template for editing features',
          drawingTool: 'esriFeatureEditToolPoint',
          prototype: {
            attributes: {},
          },
        },
      ],
      supportedQueryFormats: this.#overridables.layer.supportedQueryFormats,
      supportedAppendFormats: '',
      supportedExportFormats: '',
      supportedSpatialRelationships: [
        'esriSpatialRelIntersects',
        'esriSpatialRelContains',
        'esriSpatialRelEnvelopeIntersects',
        'esriSpatialRelWithin',
      ],
      supportedContingentValuesFormats: '',
      hasStaticData: false,
      maxRecordCount: MAX_RECORD_COUNT,
      standardMaxRecordCount: MAX_RECORD_COUNT,
      standardMaxRecordCountNoGeometry: MAX_RECORD_COUNT,
      tileMaxRecordCount: MAX_RECORD_COUNT,
      maxRecordCountFactor: 1,
      fields: [],
      relationships: [],
      ownershipBasedAccessControlForFeatures: {
        allowOthersToQuery: true,
      },
      types: [],
      timeInfo: {},
    };
  }

  featureLayerDefaults() {
    return {
      ...this.tableLayerDefaults(),
      type: 'Feature Layer',
      minScale: 0,
      maxScale: 0,
      drawingInfo: {
        renderer: {},
        labelingInfo: null,
      },
      extent: EXTENT,
      supportsCoordinatesQuantization: false,
      hasLabels: false,
    };
  }

  maxRecordCount() {
    return MAX_RECORD_COUNT;
  }

  setDefaults(optionalOverrides) {
    const { error, value } = overridablesSchema.validate(optionalOverrides, {
      stripUnknown: true,
    });

    if (error) {
      throw new Error(`FeatureServer default settings are invalid: ${error.details[0].message}.`);
    }

    this.#overridables = _.merge(this.#overridables, value);
    return;
  }

  reset() {
    this.#overridables = _.cloneDeep(defaultOverridables);
  }
}

const defaults = new MetadataDefaults();

module.exports = defaults;
