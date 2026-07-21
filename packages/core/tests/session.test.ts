import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, chmodSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  validateSessionUrl,
  readSessionConfig,
  writeSessionConfig,
  getSessionConfigPath,
} from "../src/session.js";

const fakeHome = mkdtempSync(join(tmpdir(), "gumpbox-test-"));

beforeEach(() => {
  process.env.HOME = fakeHome;
  process.env.USERPROFILE = fakeHome;
});

afterEach(() => {
  try { rmSync(join(fakeHome, ".gumpbox"), { recursive: true, force: true }); } catch {}
});

describe("validateSessionUrl", () => {
  it("accepts a valid loopback URL with token", () => {
    const r = validateSessionUrl("http://127.0.0.1:7778/global/mcp/abc-123");
    expect(r.valid).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it("accepts localhost variant", () => {
    expect(validateSessionUrl("http://localhost:7778/global/mcp/x").valid).toBe(true);
  });

  it("rejects non-loopback host", () => {
    const r = validateSessionUrl("http://example.com:7778/global/mcp/x");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/loopback|127\.0\.0\.1|localhost/i);
  });

  it("rejects non-http scheme", () => {
    const r = validateSessionUrl("ftp://127.0.0.1:7778/global/mcp/x");
    expect(r.valid).toBe(false);
  });

  it("rejects missing token segment", () => {
    const r = validateSessionUrl("http://127.0.0.1:7778/global/mcp/");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/token/i);
  });

  it("rejects malformed URL", () => {
    const r = validateSessionUrl("not-a-url");
    expect(r.valid).toBe(false);
  });
});

describe("writeSessionConfig / readSessionConfig", () => {
  it("round-trips a session URL", async () => {
    await writeSessionConfig({ sessionUrl: "http://127.0.0.1:7778/global/mcp/abc" });
    const cfg = await readSessionConfig();
    expect(cfg?.sessionUrl).toBe("http://127.0.0.1:7778/global/mcp/abc");
  });

  it("writes file with 0600 perms", async () => {
    await writeSessionConfig({ sessionUrl: "http://127.0.0.1:7778/global/mcp/abc" });
    const stat = statSync(getSessionConfigPath());
    const mode = stat.mode & 0o777;
    // Windows doesn't enforce unix perms; skip strict check there
    if (process.platform !== "win32") {
      expect(mode).toBe(0o600);
    }
  });

  it("returns null when session.json is missing", async () => {
    const cfg = await readSessionConfig();
    expect(cfg).toBeNull();
  });

  it("returns null when session.json is malformed JSON", async () => {
    const path = getSessionConfigPath();
    const dir = join(path, "..");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, "{not json");
    // BUGFIX(plan): writeFileSync creates 0o644 by default; readSessionConfig
    // refuses to read world-readable files. chmod to 0o600 to isolate the
    // malformed-JSON branch.
    if (process.platform !== "win32") chmodSync(path, 0o600);
    const cfg = await readSessionConfig();
    expect(cfg).toBeNull();
  });

  it("rejects world-readable file on POSIX", async () => {
    const path = getSessionConfigPath();
    const dir = join(path, "..");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify({ sessionUrl: "http://127.0.0.1:7778/global/mcp/x" }));
    chmodSync(path, 0o644);
    if (process.platform !== "win32") {
      await expect(readSessionConfig()).rejects.toThrow(/permission|0o600/i);
    }
  });
});
