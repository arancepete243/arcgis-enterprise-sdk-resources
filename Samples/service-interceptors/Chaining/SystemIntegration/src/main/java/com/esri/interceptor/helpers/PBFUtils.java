package com.esri.interceptor.helpers;

import com.esri.arcgis.protobuf.FeatureCollection;
import com.esri.arcgis.protobuf.FeatureCollection.FeatureCollectionPBuffer.*;

import java.io.IOException;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Schema-safe utilities for objectIds-only PBF enrichment. */
public class PBFUtils {

  public static byte[] getFeatureCollAsBytes(byte[] inputData) throws IOException {
    final FeatureCollection.FeatureCollectionPBuffer fc;
    try {
      fc = FeatureCollection.FeatureCollectionPBuffer.parseFrom(inputData);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }

    QueryResult srcQR = fc.getQueryResult();
    QueryResult updatedQR = createQueryResultWithUpdates(srcQR);

    return FeatureCollection.FeatureCollectionPBuffer
        .newBuilder(fc)             // copy everything (sr, metadata, etc.)
        .setQueryResult(updatedQR)  // replace only the payload we modified
        .build()
        .toByteArray();
  }

  private static QueryResult createQueryResultWithUpdates(QueryResult srcQR) {
    QueryResult.Builder qb = QueryResult.newBuilder(srcQR);
    switch (srcQR.getResultsCase()) {
      case FEATURERESULT:
        qb.setFeatureResult(createFeatureResultsWithUpdates(srcQR.getFeatureResult()));
        break;
      case COUNTRESULT:
      case IDSRESULT:
      case EXTENTCOUNTRESULT:
      case RESULTS_NOT_SET:
      default:
        break;
    }
    return qb.build();
  }

  private static FeatureResult createFeatureResultsWithUpdates(FeatureResult srcFR) {
    // Copy full schema/flags/values/transform etc.
    FeatureResult.Builder frb = FeatureResult.newBuilder(srcFR);

    // Field name -> index (exact-match; keep as in your working version)
    final List<Field> fields = srcFR.getFieldsList();
    final Map<String, Integer> fieldIndex = new HashMap<>(fields.size());
    for (int i = 0; i < fields.size(); i++) {
      fieldIndex.put(fields.get(i).getName(), i);
    }

    final Integer agencyIdx      = fieldIndex.getOrDefault("agency", -1);
    final Integer agencyNameIdx  = fieldIndex.getOrDefault("agency_name", -1);
    final Integer statusIdx      = fieldIndex.getOrDefault("status", -1);
    final Integer resDescIdx     = fieldIndex.getOrDefault("resolution_description", -1);
    final Integer lastActionIdx  = fieldIndex.getOrDefault("last_action_date", -1);

    final List<Feature> srcFeatures = srcFR.getFeaturesList();
    final List<Feature> newFeatures = new ArrayList<>(srcFeatures.size());

    for (Feature srcF : srcFeatures) {
      // Copy id, geometry, etc.
      Feature.Builder fb = Feature.newBuilder(srcF);

      // Mutable copy of attributes (same order as fields)
      List<Value> attrs = new ArrayList<>(srcF.getAttributesList());

      if (resDescIdx >=0) {
        ensureSize(attrs, fields.size());
        attrs.set(resDescIdx, Value.newBuilder().setStringValue("This is a test resolution description").build());
      }

      // ---- last_action_date: write a SMALL INTEGER if the field is integer-typed ----
      if (lastActionIdx >= 0 && lastActionIdx < fields.size()) {
        Field lastActionField = fields.get(lastActionIdx);
        if (lastActionField != null) {
          ensureSize(attrs, fields.size());
          FieldType t = lastActionField.getFieldType();
          if (t == FieldType.esriFieldTypeSmallInteger
              || t == FieldType.esriFieldTypeInteger) {
            attrs.set(lastActionIdx, Value.newBuilder().setInt64Value(System.currentTimeMillis()).build());
          } else if (t == FieldType.esriFieldTypeDate) {
            // If it ever becomes a true DATE field, write epoch millis
            attrs.set(lastActionIdx, Value.newBuilder().setInt64Value(System.currentTimeMillis()).build());
          } else if (isStringLike(t)) {
            // If the schema actually stores it as text, write ISO string
            String iso = ZonedDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            attrs.set(lastActionIdx, Value.newBuilder().setStringValue(iso).build());
          }
        }
      }

      // No new attributes/fields on objectIds delta
      fb.clearAttributes();
      fb.addAllAttributes(attrs);

      newFeatures.add(fb.build());
    }

    frb.clearFeatures();
    frb.addAllFeatures(newFeatures);
    return frb.build();
  }

  // Ensure attributes list can accept writes up to fields.size()
  private static void ensureSize(List<Value> attrs, int targetSize) {
    while (attrs.size() < targetSize) {
      attrs.add(Value.newBuilder().build());
    }
  }

  private static boolean isStringLike(FieldType t) {
    return t == FieldType.esriFieldTypeString
        || t == FieldType.esriFieldTypeGUID
        || t == FieldType.esriFieldTypeGlobalID
        || t == FieldType.esriFieldTypeXML
        || t == FieldType.esriFieldTypeDateOnly
        || t == FieldType.esriFieldTypeTimeOnly;
  }
}
