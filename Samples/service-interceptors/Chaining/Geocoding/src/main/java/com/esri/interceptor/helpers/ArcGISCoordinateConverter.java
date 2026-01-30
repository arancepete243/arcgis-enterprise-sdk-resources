package com.esri.interceptor.helpers;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class ArcGISCoordinateConverter {
  private static final String ARCGIS_PROJECT_API = "https://utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer/project";

  // Function to Convert Coordinates Using ArcGIS REST API
  public static double[] convertCoordinates(double x, double y, int wkid, int latestWkid, int outwkid) {
    try {
      // Construct the JSON payload for geometry
      String geometryJson = String.format("{\"geometryType\":\"esriGeometryPoint\",\"geometries\":[{\"x\":%f,\"y\":%f,\"spatialReference\":{\"latestWkid\":%d,\"wkid\":%d}}]}",
          x, y, latestWkid, wkid);

      // Construct API request URL
      String params = "f=json"
          + "&inSR=" + latestWkid
          + "&outSR=" + outwkid
          + "&geometries=" + URLEncoder.encode(geometryJson, StandardCharsets.UTF_8);

      URL url = new URL(ARCGIS_PROJECT_API + "?" + params);
      HttpURLConnection conn = (HttpURLConnection) url.openConnection();
      conn.setRequestMethod("GET");

      // Read response in one go
      String response;
      try (InputStream inputStream = conn.getInputStream()) {
        response = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
      }

      // Parse JSON Response
      JSONObject jsonResponse = new JSONObject(response);
      JSONArray geometries = jsonResponse.getJSONArray("geometries");

      if (!geometries.isEmpty()) {
        JSONObject converted = geometries.getJSONObject(0);
        return new double[]{converted.getDouble("x"), converted.getDouble("y")}; // Returns [longitude, latitude]
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
    return new double[]{x, y}; // Return original if conversion fails
  }
}
