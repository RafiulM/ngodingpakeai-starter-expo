import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { APP_ORIGIN, BROWSER_ORIGIN, originHeader } from "./helpers";

const app = createApp();

describe("HTTP plumbing", () => {
  it("reports liveness and readiness", async () => {
    expect((await request(app).get("/api/health")).body).toEqual({
      status: "ok",
    });
    expect((await request(app).get("/api/health/ready")).body).toEqual({
      status: "ok",
      database: "ok",
    });
  });

  it("allows CORS with credentials for TRUSTED_ORIGINS browsers only", async () => {
    const allowed = await request(app)
      .options("/api/notes")
      .set("Origin", BROWSER_ORIGIN)
      .set("Access-Control-Request-Method", "POST");
    expect(allowed.headers["access-control-allow-origin"]).toBe(BROWSER_ORIGIN);
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

    // The app's scheme is trusted for CSRF checks, but it is not a browser
    // origin, so it never appears in CORS headers.
    for (const origin of ["https://evil.example", APP_ORIGIN]) {
      const denied = await request(app)
        .options("/api/notes")
        .set("Origin", origin)
        .set("Access-Control-Request-Method", "POST");
      expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    }
  });

  it("generates or echoes a safe X-Request-Id", async () => {
    const generated = await request(app).get("/api/health");
    expect(generated.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);

    const echoed = await request(app)
      .get("/api/health")
      .set("X-Request-Id", "trace-123");
    expect(echoed.headers["x-request-id"]).toBe("trace-123");

    const unsafe = await request(app)
      .get("/api/health")
      .set("X-Request-Id", "bad id <script>");
    expect(unsafe.headers["x-request-id"]).not.toContain("bad");
  });

  it("refuses oversized Better Auth bodies before they are read", async () => {
    const response = await request(app)
      .post("/api/auth/sign-up/email")
      .set(originHeader)
      .set("Content-Type", "application/json")
      .send(
        JSON.stringify({
          name: "x".repeat(200 * 1024),
          email: "too-big@example.com",
          password: "Test-password-123!",
        }),
      );
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("refuses a streamed Better Auth body without a Content-Length", async () => {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const { port } = server.address() as AddressInfo;
      // Node's fetch needs duplex for a stream body; the DOM type omits it.
      const init: RequestInit & { duplex: "half" } = {
        method: "POST",
        headers: { "content-type": "application/json", ...originHeader },
        // A stream has no known length, so it goes out chunked.
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("{}"));
            controller.close();
          },
        }),
        duplex: "half",
      };
      const response = await fetch(
        `http://127.0.0.1:${port}/api/auth/sign-in/email`,
        init,
      );
      expect(response.status).toBe(411);
    } finally {
      server.close();
    }
  });

  it("answers unknown routes with the JSON error envelope", async () => {
    const response = await request(app).get("/nope");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found." },
    });
  });
});
