import assert from "node:assert/strict";
import { test } from "node:test";
import {
  seal,
  unseal,
  boundedBody,
  previewType,
  safeName,
} from "../lib/drive-security";
const key = "test-only-secret-with-at-least-32-characters";
test("refresh tokens are encrypted with unique nonces and authenticated", () => {
  const a = seal("refresh-token", key),
    b = seal("refresh-token", key);
  assert.notEqual(a, b);
  assert.ok(!a.includes("refresh-token"));
  assert.equal(unseal(a, key), "refresh-token");
  assert.throws(() => unseal(a, key + "different"));
  const bytes = Buffer.from(a, "base64url");
  bytes[29] ^= 1;
  assert.throws(() => unseal(bytes.toString("base64url"), key));
  assert.throws(() => seal("token", "short"));
});
test("upload limit is enforced even without Content-Length", async () => {
  const request = new Request("https://example.com", {
    method: "POST",
    body: "12345",
  });
  await assert.rejects(() => boundedBody(request, 4), /exceeds/);
  assert.equal(
    (
      await boundedBody(
        new Request("https://example.com", { method: "POST", body: "1234" }),
        4,
      )
    ).toString(),
    "1234",
  );
});
test("oversize chunked stream is cancelled before accepting later bytes", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(10));
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request("https://example.com", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(() => boundedBody(req, 5), /exceeds/);
  assert.ok(cancelled);
});
test("empty and oversized declared uploads are rejected", async () => {
  await assert.rejects(
    () =>
      boundedBody(
        new Request("https://example.com", { method: "POST", body: "" }),
        10,
      ),
    /Empty/,
  );
  await assert.rejects(
    () =>
      boundedBody(
        new Request("https://example.com", {
          method: "POST",
          body: "x",
          headers: { "Content-Length": "100" },
        }),
        10,
      ),
    /exceeds/,
  );
});
test("active content cannot obtain an inline preview by claiming an image name", () => {
  assert.equal(
    previewType(Buffer.from('<svg onload="alert(1)"></svg>')),
    "application/octet-stream",
  );
  assert.equal(
    previewType(Buffer.from("<html>attack</html>")),
    "application/octet-stream",
  );
  assert.equal(
    previewType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(previewType(Buffer.from([255, 216, 255, 224])), "image/jpeg");
});
test("file names cannot inject paths or response headers", () => {
  assert.equal(
    safeName("../test\r\nX-Header: true"),
    ".._test__X-Header: true",
  );
  assert.equal(safeName("a".repeat(200)).length, 180);
  assert.throws(() => safeName("  "));
});
