package com.esri.interceptor.helpers;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

public class Enrich {

  public static JSONArray appendJSONStringRequest(JSONArray editsArray) {
    for (int i = 0; i < editsArray.length(); i++) {
      JSONObject addObject = editsArray.getJSONObject(i);
      JSONObject attributes = addObject.optJSONObject("attributes");
      String incident_id = String.valueOf(attributes.get("incident_id"));

      //Here for example purpose we are adding default static values.
      //But technically you can retrieve these values from any third party system where actual data is stored.
      if (incident_id == null || incident_id.equalsIgnoreCase("null")) {
        attributes.put("incident_id", "INCTest");
        attributes.put("agency", "NYPD");
        attributes.put("agency_name", "New York City Police Department");
      }
    }
    return editsArray;
  }

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
          if (attributes.has("resolution_description")) {
            attributes.put("resolution_description", "This is a test resolution description");
          }
          if (attributes.has("last_action_date")) {
            attributes.put("last_action_date", String.valueOf(Instant.now().getEpochSecond()));
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
