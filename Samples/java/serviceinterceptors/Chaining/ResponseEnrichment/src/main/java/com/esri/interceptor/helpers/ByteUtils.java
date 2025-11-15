package com.esri.interceptor.helpers;

import java.io.*;
import java.util.zip.*;

public final class ByteUtils {
  private ByteUtils() {}

  private static final int BUF = 16 * 1024;

  // HTTP Content-Encoding names
  public static final String ENC_IDENTITY   = "identity";
  public static final String ENC_GZIP       = "gzip";
  /** In HTTP practice, "deflate" is zlib-wrapped DEFLATE. */
  public static final String ENC_DEFLATE    = "deflate";
  /** Not an HTTP Content-Encoding, but useful to name explicitly. */
  public static final String ENC_ZLIB       = "zlib";
  /** Internal/optional: raw DEFLATE stream (no zlib header). */
  public static final String ENC_RAW_DEFLATE = "raw-deflate";

  /* =======================
   * Public API
   * ======================= */

  /** Compress bytes using the given (HTTP) content-encoding. */
  public static byte[] compress(byte[] data, String contentEncoding) throws IOException {
    if (data == null || data.length == 0) return new byte[0];
    if (contentEncoding == null || contentEncoding.isEmpty() ||
        ENC_IDENTITY.equalsIgnoreCase(contentEncoding)) {
      return data; // no-op
    }
    String enc = contentEncoding.toLowerCase();
    switch (enc) {
      case ENC_GZIP:
        return gzipCompress(data);
      case ENC_DEFLATE: // HTTP "deflate" → zlib-wrapped DEFLATE
      case ENC_ZLIB:
        return zlibCompress(data);
      case ENC_RAW_DEFLATE:
        return rawDeflateCompress(data);
      default:
        return data;
    }
  }

  /**
   * Decompress bytes using an explicit content-encoding.
   * Best-effort: returns original data if decompression fails.
   */
  public static byte[] decompress(byte[] data, String contentEncoding) throws IOException {
    if (data == null || data.length == 0) return new byte[0];
    if (contentEncoding == null || contentEncoding.isEmpty() ||
        ENC_IDENTITY.equalsIgnoreCase(contentEncoding)) {
      return data; // no-op
    }
    String enc = contentEncoding.toLowerCase();
    try {
      switch (enc) {
        case ENC_GZIP:
          return gzipDecompress(data);
        case ENC_DEFLATE: // usually zlib-wrapped; fall back to raw if needed
          try { return zlibDecompress(data); } catch (IOException e) { return rawDeflateDecompress(data); }
        case ENC_ZLIB:
          return zlibDecompress(data);
        case ENC_RAW_DEFLATE:
          return rawDeflateDecompress(data);
        default:
          return data;
      }
    } catch (IOException | RuntimeException ex) {
      return data; // best-effort fallback
    }
  }

  /**
   * Sniff & decompress: tries gzip → zlib → raw-deflate; otherwise returns input unchanged.
   */
  public static byte[] decompress(byte[] data) throws IOException {
    if (data == null || data.length == 0) return data;

    if (looksLikeGzip(data)) {
      try { return gzipDecompress(data); } catch (IOException ignored) {}
    }
    if (looksLikeZlib(data)) {
      try { return zlibDecompress(data); } catch (IOException ignored) {}
    }
    // Try “deflate” fallbacks: zlib first, then raw
    try { return zlibDecompress(data); } catch (IOException ignored) {}
    try { return rawDeflateDecompress(data); } catch (IOException ignored) {}

    return data;
  }

  /* =======================
   * GZIP
   * ======================= */

  private static boolean looksLikeGzip(byte[] d) {
    return d.length >= 2 && d[0] == (byte)0x1F && d[1] == (byte)0x8B;
  }

  private static byte[] gzipCompress(byte[] uncompressed) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    try (GZIPOutputStream gos = new GZIPOutputStream(out)) {
      gos.write(uncompressed);
    }
    return out.toByteArray();
  }

  private static byte[] gzipDecompress(byte[] gz) throws IOException {
    try (GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(gz))) {
      return toByteArray(gis);
    }
  }

  /* =======================
   * ZLIB / DEFLATE
   * ======================= */

  /**
   * Basic zlib header sniff:
   *  - CMF's compression method (CM) must be 8 (DEFLATE)
   *  - (CMF<<8 | FLG) % 31 == 0 (header checksum)
   */
  private static boolean looksLikeZlib(byte[] d) {
    if (d.length < 2) return false;
    int cmf = d[0] & 0xFF;
    int flg = d[1] & 0xFF;
    if ((cmf & 0x0F) != 8) return false;               // DEFLATE method
    if (((cmf << 8) + flg) % 31 != 0) return false;    // header check
    return true;
  }

  private static byte[] zlibCompress(byte[] uncompressed) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    try (DeflaterOutputStream dos = new DeflaterOutputStream(out, new Deflater(Deflater.DEFAULT_COMPRESSION, /*nowrap=*/false))) {
      dos.write(uncompressed);
    }
    return out.toByteArray();
  }

  private static byte[] zlibDecompress(byte[] z) throws IOException {
    try (InflaterInputStream iis = new InflaterInputStream(new ByteArrayInputStream(z), new Inflater(/*nowrap=*/false))) {
      return toByteArray(iis);
    }
  }

  /** Raw DEFLATE (no zlib header) — not standard for HTTP ‘deflate’. */
  private static byte[] rawDeflateCompress(byte[] uncompressed) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    try (DeflaterOutputStream dos = new DeflaterOutputStream(out, new Deflater(Deflater.DEFAULT_COMPRESSION, /*nowrap=*/true))) {
      dos.write(uncompressed);
    }
    return out.toByteArray();
  }

  private static byte[] rawDeflateDecompress(byte[] raw) throws IOException {
    Inflater inflater = new Inflater(/*nowrap=*/true);
    try (InflaterInputStream iis = new InflaterInputStream(new ByteArrayInputStream(raw), inflater)) {
      return toByteArray(iis);
    } finally {
      inflater.end();
    }
  }

  /* =======================
   * Helpers
   * ======================= */

  private static byte[] toByteArray(InputStream in) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    byte[] buf = new byte[BUF];
    int r;
    while ((r = in.read(buf)) != -1) {
      out.write(buf, 0, r);
    }
    return out.toByteArray();
  }
}
