package com.esri.interceptor.samples;

import com.esri.arcgis.enterprise.interceptor.IInterceptorResponse;
import com.esri.arcgis.enterprise.interceptor.server.ServerServicesInterceptorResponseWrapper;
import com.esri.interceptor.helpers.ByteUtils;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;

import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * Response wrapper for single-filter setup:
 * - Buffers downstream output (writer OR stream).
 * - JSON/PBF helpers write directly to the real response with matching headers.
 * - Passthrough send does NOT reset headers, preserving server’s originals.
 */
public class ServiceInterceptorResponse extends ServerServicesInterceptorResponseWrapper {

  // ---- Capture sinks ----
  private final ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
  private PrintWriter printWriter;
  private ServletOutputStream servletOutputStream;

  // ---- State/flags ----
  private boolean writerUsed = false;
  private boolean streamUsed = false;
  private final String characterEncoding = StandardCharsets.UTF_8.name();

  public ServiceInterceptorResponse(IInterceptorResponse interceptorResponse) {
    super(interceptorResponse);
  }

  // --------------------------------------
  // Accessors: idempotent & spec-friendly
  // --------------------------------------
  @Override
  public PrintWriter getWriter() throws IOException {
    if (streamUsed) {
      throw new IllegalStateException("getOutputStream() already called");
    }
    if (printWriter == null) {
      // Single bytes buffer; writer on top with current charset
      OutputStreamWriter osw = new OutputStreamWriter(byteArrayOutputStream, Charset.forName(characterEncoding));
      printWriter = new PrintWriter(osw, /*autoFlush*/ true);
      writerUsed = true;
    }
    return printWriter; // return same instance on subsequent calls
  }

  @Override
  public ServletOutputStream getOutputStream() throws IOException {
    if (writerUsed) {
      throw new IllegalStateException("getWriter() already called");
    }
    if (servletOutputStream == null) {
      servletOutputStream = new ServletOutputStream() {
        @Override public boolean isReady() { return true; } // no async backpressure support
        @Override public void setWriteListener(WriteListener writeListener) {
          // Not supporting async I/O in this wrapper. Consider throwing if you want to surface misuse:
          // throw new IllegalStateException("Async I/O not supported by this wrapper");
        }
        @Override public void write(int b) throws IOException { byteArrayOutputStream.write(b); }
        @Override public void write(byte[] b, int off, int len) throws IOException { byteArrayOutputStream.write(b, off, len); }
      };
      streamUsed = true;
    }
    return servletOutputStream; // return same instance on subsequent calls
  }

  // --------------------------------------
  // Flushing & resetting (capture semantics)
  // --------------------------------------
  @Override
  public void flushBuffer() throws IOException {
    // Flush only our capture sinks; do NOT call super.flushBuffer() to avoid premature commit.
    if (writerUsed && printWriter != null) {
      printWriter.flush();
    }
    if (streamUsed && servletOutputStream != null) {
      // ServletOutputStream flush would normally commit; here we only ensure BAOS is up to date.
      // BAOS#flush is a no-op but call for symmetry.
      byteArrayOutputStream.flush();
    }
  }

  @Override
  public void resetBuffer() {
    // Clear our buffers only; do NOT delegate to super to avoid committing or altering headers undesirably.
    byteArrayOutputStream.reset();
    // If writer was created, its encoding state persists; that's fine because we still target the same buffer.
  }

  /** Convenience: closes writer/stream (no super.close/commit). Safe to call multiple times. */
  public void closeQuietly() {
    try {
      if (printWriter != null) printWriter.flush();
    } catch (Exception ignored) {}
  }

  // --------------------------
  // Introspection helpers
  // --------------------------
  public boolean wroteViaWriter() { return writerUsed; }
  public boolean wroteViaStream() { return streamUsed; }
  public int getBufferedSize() { return byteArrayOutputStream.size(); }

  // --------------------------
  // Payload accessors
  // --------------------------
  /** Returns the captured payload as bytes. Optionally attempts to decompress via helper. */
  public byte[] getResponseDataAsBytes(boolean tryDecompress) throws IOException {
    flushBuffer();
    byte[] raw = byteArrayOutputStream.toByteArray();
    if (!tryDecompress) return raw;
    try {
      // Prefer a helper-based decompress if you have one; otherwise no-op and return raw.
      // Replace with your own utility if needed.
      byte[] maybe = ByteUtils.decompress(raw); // assume no-op if not compressed
      return (maybe != null ? maybe : raw);
    } catch (Exception e) {
      return raw; // fall back safely
    }
  }

  /** Replace response with appropriate compression and matching headers. Applicable for any content type HTML, JSON, PBF etc. */
  public void sendResponse(IInterceptorResponse originalResponse, byte[] enrichedResponse, boolean compress) throws IOException {
    String contentEncoding = this.getHeader("Content-Encoding");
    byte[] out;
    if (enrichedResponse == null || enrichedResponse.length == 0) {
      compress = false;
      enrichedResponse = this.getResponseDataAsBytes(false);
    }
    out = compress ? ByteUtils.compress(enrichedResponse, contentEncoding) : enrichedResponse;
    if (!originalResponse.isCommitted()) originalResponse.resetBuffer();
    if (compress && !contentEncoding.isEmpty()) {
      // Always set the correct length for the representation we’re sending.
      try {
        originalResponse.getClass().getMethod("setContentLengthLong", long.class).invoke(originalResponse, (long) out.length);
      } catch (Throwable t) {
        originalResponse.setContentLength(out.length);
      }
    }
    if (out == null || out.length == 0) {
      out = new byte[0];
    }
    originalResponse.getOutputStream().write(out);
    originalResponse.getOutputStream().flush();
  }
}
