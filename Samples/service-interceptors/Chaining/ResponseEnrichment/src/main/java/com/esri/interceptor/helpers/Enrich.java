package com.esri.interceptor.helpers;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

public class Enrich {
  public static String convertToString(byte[] data, String charEncoding) {
    String original;
    try {
      original = new String(data, Charset.forName(
          (charEncoding == null || charEncoding.isEmpty()) ? StandardCharsets.UTF_8.name() : charEncoding));
    } catch (IllegalArgumentException ex) { // bad/unknown charset name
      original = new String(data, StandardCharsets.UTF_8);
    }
    return original;
  }

  public static String appendJSONStringResponse(String responseString) {
    JSONObject responseJson = new JSONObject(responseString);
    if (responseJson.has("features")) {
      JSONArray featuresArray = responseJson.getJSONArray("features");
      for (int i = 0; i < featuresArray.length(); i++) {
        JSONObject feature = featuresArray.getJSONObject(i);
        // Just for example purpose default values are updated.
        // Technical it's possible to retrieve values from external system and attach it to response.
        if (feature.has("attributes")) {
          JSONObject attributes = feature.optJSONObject("attributes");
          if (attributes.has("agency")) {
            attributes.put("agency", "NYPD");
          }
          if (attributes.has("agency_name")) {
            attributes.put("agency_name", "New York City Police Department");
          }
          if (attributes.has("status")) {
            attributes.put("status", "In Progress");
          }
        }
      }
    }
    return responseJson.toString(2);
  }

  public static byte[] appendPBFResponse(byte[] responseBytes) throws IOException {
    return PBFUtils.getFeatureCollAsBytes(responseBytes);
  }

}
