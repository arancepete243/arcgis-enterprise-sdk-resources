const _ = require('lodash');
const TableLayerMetadata = require('./table-layer-metadata');
const { PointRenderer, LineRenderer, PolygonRenderer } = require('./renderers');
const defaults = require('../metadata-defaults');

class FeatureLayerMetadata extends TableLayerMetadata {
  static create(geojson, metadata, layerId) {
    const layerMetadata = new FeatureLayerMetadata();
    return layerMetadata.mixinOverrides(geojson, metadata, layerId);
  }

  constructor() {
    super();
    Object.assign(this, defaults.featureLayerDefaults());
    return this;
  }

  mixinOverrides(geojson, metadata, layerId) {
    super.mixinOverrides(geojson, metadata, layerId);

    const { renderer, labelingInfo, extent, orientedImageryInfo, geometryType } = metadata;

    this.geometryType = geometryType;

    this.extent = extent;

    this.#setType(orientedImageryInfo);

    this.#_setRenderer(renderer);

    this.#_setLabelingInfo(labelingInfo);

    this.#_setDirectOverrides(metadata, layerId);

    return this;
  }

  #setType(orientedImageryInfo) {
    if (orientedImageryInfo) {
      this.type = 'Oriented Imagery Layer';
    }
  }

  #_setRenderer(renderer) {
    if (renderer) {
      this.drawingInfo.renderer = renderer;
      return;
    }

    if (this.geometryType === 'esriGeometryPolygon') {
      this.drawingInfo.renderer = new PolygonRenderer();
      return;
    }

    if (this.geometryType === 'esriGeometryPolyline') {
      this.drawingInfo.renderer = new LineRenderer();
      return;
    }

    this.drawingInfo.renderer = new PointRenderer();
  }

  #_setLabelingInfo(labelingInfo) {
    if (labelingInfo) {
      this.drawingInfo.labelingInfo = labelingInfo;
    }
  }

  #_setDirectOverrides(options) {
    super._setDirectOverrides(options);
    const { minScale, maxScale, supportsCoordinatesQuantization, orientedImageryInfo } = options;

    _.merge(this, {
      minScale,
      maxScale,
      supportsCoordinatesQuantization,
    });

    if (orientedImageryInfo) {
      this.orientedImageryInfo = orientedImageryInfo;
    }
  }
}

module.exports = FeatureLayerMetadata;
