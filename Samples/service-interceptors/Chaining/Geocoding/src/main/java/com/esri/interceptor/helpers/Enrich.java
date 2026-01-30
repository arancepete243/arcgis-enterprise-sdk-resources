package com.esri.interceptor.helpers;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.IOException;


public class Enrich {

  public static JSONArray appendLocationInformation(JSONArray editsArray) throws IOException {
    for (int i = 0; i < editsArray.length(); i++) {
      JSONObject addObject = editsArray.getJSONObject(i);
      JSONObject geometry = addObject.optJSONObject("geometry");
      JSONObject attributes = addObject.optJSONObject("attributes");

      // Get Reverse Geocoded Address if geometry exists
      if (geometry != null && geometry.has("x") && geometry.has("y")) {
        double x = geometry.getDouble("x");
        double y = geometry.getDouble("y");
        // Extract spatial reference details
        int latestWkid = geometry.optJSONObject("spatialReference").optInt("latestWkid", -1);
        int wkid = geometry.optJSONObject("spatialReference").optInt("wkid", -1);

        // Convert coordinates using ArcGIS API
        double[] convertedXY = ArcGISCoordinateConverter.convertCoordinates(x, y, wkid, latestWkid, 4326);
        String X = String.valueOf(convertedXY[0]);
        String Y = String.valueOf(convertedXY[1]);
        String addressDetails = ReverseGeocodeAPI.retrieveDetails(X + "," + Y);
        if (!addressDetails.isEmpty()) {
          if (!addressDetails.contains("error")) {
            JSONObject addressObject = new JSONObject(addressDetails).getJSONObject("address");
            attributes.put("address", addressObject.optString("Match_addr", ""));
            attributes.put("zipcode", addressObject.optLong("Postal"));
            attributes.put("street_name", addressObject.optString("Address", ""));
            attributes.put("city", addressObject.optString("City", ""));
          }
        }
      }
    }
    return editsArray;
  }
}
