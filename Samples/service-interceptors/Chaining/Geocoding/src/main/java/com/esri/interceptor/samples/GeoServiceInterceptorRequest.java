package com.esri.interceptor.samples;

import com.esri.arcgis.enterprise.interceptor.IInterceptorRequest;
import com.esri.arcgis.enterprise.interceptor.server.ServerServicesInterceptorRequestWrapper;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;

import java.io.*;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class GeoServiceInterceptorRequest extends ServerServicesInterceptorRequestWrapper {

  private ByteArrayInputStream byteArrayInputStream;
  private BufferedReader reader;
  private ServletInputStream servletInputStream;

  private boolean streamUsed = false;
  private boolean readerUsed = false;

  private byte[] rawBody = new byte[0];   // always the source of truth
  private String requestBody = "";        // text view when needed

  private final Map<String, String[]> parameterMap;

  private final boolean formUrlEncoded;
  private final Charset bodyCharset;

  public GeoServiceInterceptorRequest(IInterceptorRequest interceptorRequest) {
    super(interceptorRequest);

    // Charset from Content-Type; default UTF-8
    this.bodyCharset = resolveCharset(interceptorRequest.getContentType());
    this.formUrlEncoded = isFormUrlEncoded(interceptorRequest.getContentType());

    // Start from container-parsed params (query + body)
    this.parameterMap = new HashMap<>(interceptorRequest.getParameterMap());

    readRequestBody(interceptorRequest); // may augment parameterMap if form
  }

  private static Charset resolveCharset(String contentType) {
    if (contentType != null) {
      for (String part : contentType.split(";")) {
        String p = part.trim();
        if (p.toLowerCase(Locale.ROOT).startsWith("charset=")) {
          try { return Charset.forName(p.substring(8).trim()); } catch (Exception ignore) {}
        }
      }
    }
    return StandardCharsets.UTF_8;
  }

  private static boolean isFormUrlEncoded(String contentType) {
    return contentType != null
        && contentType.toLowerCase(Locale.ROOT).startsWith("application/x-www-form-urlencoded");
  }

  private void readRequestBody(IInterceptorRequest req) {
    try (ServletInputStream in = req.getInputStream();
         ByteArrayOutputStream baos = new ByteArrayOutputStream(8 * 1024)) {

      byte[] buf = new byte[8192];
      int n;
      while ((n = in.read(buf)) != -1) baos.write(buf, 0, n);

      // (2) Keep raw bytes and only then create a text view
      this.rawBody = baos.toByteArray();
      this.requestBody = new String(rawBody, bodyCharset);
      this.byteArrayInputStream = new ByteArrayInputStream(rawBody);

      // 1) Only self-parse form body if the container didn’t already do it
      if (formUrlEncoded && parameterMap.isEmpty() && rawBody.length > 0) {
        parseFormParametersIntoMap(requestBody, parameterMap, bodyCharset);
      }
    } catch (Exception e) {
      this.rawBody = new byte[0];
      this.requestBody = "";
      this.byteArrayInputStream = new ByteArrayInputStream(rawBody);
    }
  }

  /** Merge form-urlencoded pairs into the map; support repeated keys. */
  private static void parseFormParametersIntoMap(String body, Map<String, String[]> map, Charset cs) {
    String[] pairs = body.split("&");
    for (String pair : pairs) {
      if (pair.isEmpty()) continue;
      String[] kv = pair.split("=", 2);
      String rawK = kv.length > 0 ? kv[0] : "";
      String rawV = kv.length > 1 ? kv[1] : "";
      String key = urlDecode(rawK, cs);
      String value = urlDecode(rawV, cs);

      String[] prev = map.get(key);
      if (prev == null) {
        map.put(key, new String[]{value});
      } else {
        String[] next = Arrays.copyOf(prev, prev.length + 1);
        next[next.length - 1] = value;
        map.put(key, next);
      }
    }
  }

  private static String urlDecode(String s, Charset cs) {
    try { return URLDecoder.decode(s, cs); } catch (Exception e) { return s; }
  }
  private static String urlEncode(String s, Charset cs) {
    try { return URLEncoder.encode(s, cs); } catch (Exception e) { return s; }
  }

  /** Only decode for callers that *expect* form bodies. */
  public String getRequestBody() {
    return requestBody; // return as-is; caller can decide to decode if needed
  }

  /** Optional helper if you really want decoded form text. */
  public String getDecodedFormBodyOrEmpty() {
    return formUrlEncoded ? urlDecode(requestBody, bodyCharset) : "";
  }

  // Input stream/reader should read from raw bytes, not re-encoded string
  @Override
  public BufferedReader getReader() {
    if (streamUsed) {
      throw new IllegalStateException("ServletInputStream already obtained");
    }
    if (reader == null) {
      // Reader over raw bytes using resolved charset
      reader = new BufferedReader(new InputStreamReader(new ByteArrayInputStream(rawBody), bodyCharset));
      readerUsed = true;
    }
    return reader;
  }

  @Override
  public ServletInputStream getInputStream() {
    if (readerUsed) {
      throw new IllegalStateException("Reader already obtained");
    }
    if (servletInputStream == null) {
      // Stream over raw bytes
      byteArrayInputStream = new ByteArrayInputStream(rawBody);
      servletInputStream = new ServletInputStream() {
        @Override public boolean isFinished() { return byteArrayInputStream.available() == 0; }
        @Override public boolean isReady() { return true; }
        @Override public void setReadListener(ReadListener readListener) {}
        @Override public int read() { return byteArrayInputStream.read(); }
      };
      streamUsed = true;
    }
    return servletInputStream;
  }

  // ---- Parameter API (mirrors servlet) ----
  @Override
  public String getParameter(String name) {
    String[] values = parameterMap.get(name);
    return (values != null && values.length > 0) ? values[0] : null;
  }

  @Override
  public Map<String, String[]> getParameterMap() {
    return Collections.unmodifiableMap(parameterMap);
  }

  @Override
  public Enumeration<String> getParameterNames() {
    return Collections.enumeration(parameterMap.keySet());
  }

  @Override
  public String[] getParameterValues(String name) {
    return parameterMap.get(name); // return as stored; callers should not mutate
  }

  /** Update or add a single-valued parameter. Also rebuilds the body if form-encoded. */
  public void updateParameter(String key, String newValue) {
    parameterMap.put(key, new String[]{newValue});
    if (formUrlEncoded) rebuildFormBodyFromParameterMap();
  }

  /** Update a multivalued parameter. Also rebuilds the body if form-encoded. */
  public void updateParameter(String key, String[] newValues) {
    parameterMap.put(key, newValues);
    if (formUrlEncoded) rebuildFormBodyFromParameterMap();
  }

  /** Remove parameter and rebuild body if needed. */
  public void removeParameter(String key) {
    parameterMap.remove(key);
    if (formUrlEncoded) rebuildFormBodyFromParameterMap();
  }

  /** Replace entire body (JSON etc.); resets streams. */
  public void updateRequestBody(String newRequestBody) {
    this.requestBody = (newRequestBody != null) ? newRequestBody : "";
    this.rawBody = this.requestBody.getBytes(bodyCharset); // (2)
    resetBodyStreams();
  }

  // When mutating the body from parameters:
  private void rebuildFormBodyFromParameterMap() {
    StringBuilder sb = new StringBuilder();
    boolean first = true;
    for (Map.Entry<String, String[]> e : parameterMap.entrySet()) {
      String k = e.getKey();
      String[] vals = e.getValue();
      if (vals == null || vals.length == 0) {
        if (!first) sb.append('&');
        sb.append(urlEncode(k, bodyCharset)).append('=');
        first = false;
        continue;
      }
      for (String v : vals) {
        if (!first) sb.append('&');
        sb.append(urlEncode(k, bodyCharset)).append('=')
            .append(urlEncode(v != null ? v : "", bodyCharset));
        first = false;
      }
    }
    this.requestBody = sb.toString();
    this.rawBody = this.requestBody.getBytes(bodyCharset); // (2)
    resetBodyStreams();
  }

  private void resetBodyStreams() {
    this.byteArrayInputStream = new ByteArrayInputStream(rawBody);
    this.reader = null;
    this.servletInputStream = null;
    this.streamUsed = false;
    this.readerUsed = false;
  }

  // Optional: reflect new length when we’ve rebuilt the body
  @Override
  public int getContentLength() { return rawBody.length; }

  @Override
  public long getContentLengthLong() { return rawBody.length; }
}
