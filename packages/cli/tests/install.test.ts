import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { install } from "../src/install.js";

const fakeHome = mkdtempSync(join(tmpdir(), "gumpbox-cli-"));

beforeEach(() => {
  process.env.HOME = fakeHome;
  process.env.USERPROFILE = fakeHome;
});

afterEach(() => {
  rmSync(join(fakeHome, ".claude"), { recursive: true, force: true });
  rmSync(join(fakeHome, ".codex"), { recursive: true, force: true });
  rmSync(join(fakeHome, ".gemini"), { recursive: true, force: true });
  rmSync(join(fakeHome, ".gumpbox"), { recursive: true, force: true });
});

describe("install", () => {
  it("writes claude-code config referencing global proxy binary", async () => {
    // Skip the interactive prompt in set-url by pre-writing session.json
    const { writeSessionConfig } = await import("@gumpbox/core");
    await writeSessionConfig({ sessionUrl: "http://127.0.0.1:7778/global/mcp/abcdef123456" });
    // install() calls setUrl() which prompts — patch stdin to feed the URL
    const origIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = false;
    const chunks = ["http://127.0.0.1:7778/global/mcp/abcdef123456\n"];
    process.stdin.on = ((orig: any) => (event: string, cb: (d: Buffer) => void) => {
      if (event === "data") setTimeout(() => cb(Buffer.from(chunks.shift() ?? "")), 0);
      return process.stdin;
    })(process.stdin.on);
    try {
      await install("claude-code");
    } finally {
      process.stdin.isTTY = origIsTTY;
    }

    const path = join(fakeHome, ".claude", "mcp-servers", "gumpbox.json");
    expect(existsSync(path)).toBe(true);
    const cfg = JSON.parse(readFileSync(path, "utf8"));
    expect(cfg.mcpServers.gumpbox.command).toMatch(/gumpbox-mcp-proxy/);
  });

  it("rejects unknown client", async () => {
    await expect(install("nonsense")).rejects.toThrow();
  });
});
