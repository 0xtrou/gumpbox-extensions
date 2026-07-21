import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { writeSessionConfig } from "../src/session.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

// BUGFIX(plan): plan used `join(process.cwd(), "packages/core/dist/proxy.js")`
// but vitest runs tests with cwd = packages/core, which doubled the path and
// the dynamic import silently failed (subprocess never wrote to stdout, test
// timed out). Resolve against the test file's location instead.
const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "..", "dist");
const proxyPath = join(distDir, "proxy.js");
const sessionPath = join(distDir, "session.js");

let server: Server;
let port = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      const body = JSON.parse(buf || "{}");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { echoed: body.method } }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as any).port;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

function startProxy(home: string): ChildProcess {
  // We invoke the proxy by compiling and running src/proxy.ts via a tiny launcher.
  // Simpler: directly invoke `node --loader ts-node/esm src/proxy.ts` won't work in tests.
  // Instead we use a stub main that imports runStdioProxy and starts it.
  return spawn("node", [
    "--experimental-vm-modules",
    "-e",
    `
      import(${JSON.stringify(proxyPath)}).then(async (mod) => {
        await mod.runStdioProxy({
          clientName: "test",
          clientVersion: "1.0",
          getSessionConfig: async () => {
            const s = await import(${JSON.stringify(sessionPath)});
            return s.readSessionConfig();
          },
        });
      });
    `,
  ], {
    env: { ...process.env, HOME: home, USERPROFILE: home },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function sendRpc(proc: ChildProcess, msg: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const onOut = (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          resolve(JSON.parse(line));
          proc.stdout?.off("data", onOut);
          return;
        } catch {}
      }
    };
    proc.stdout?.on("data", onOut);
    proc.stdin?.write(JSON.stringify(msg) + "\n");
    setTimeout(() => reject(new Error("timeout")), 3000);
  });
}

describe("runStdioProxy", () => {
  it("forwards JSON-RPC over HTTP and returns response", async () => {
    const fakeHome = mkdtempSync(join(tmpdir(), "gumpbox-proxy-"));
    try {
      await writeSessionConfig({
        sessionUrl: `http://127.0.0.1:${port}/global/mcp/good-token-12345`,
      });
      // Move session.json into the fake HOME
      const { mkdirSync, copyFileSync, existsSync } = await import("node:fs");
      const targetDir = join(fakeHome, ".gumpbox");
      mkdirSync(targetDir, { recursive: true });
      const realHome = process.env.HOME!;
      if (existsSync(join(realHome, ".gumpbox", "session.json"))) {
        copyFileSync(join(realHome, ".gumpbox", "session.json"), join(targetDir, "session.json"));
      }

      const proc = startProxy(fakeHome);
      const resp = await sendRpc(proc, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
      expect(resp.id).toBe(1);
      expect(resp.result).toEqual({ echoed: "tools/list" });
      proc.kill();
    } finally {
      rmSync(fakeHome, { recursive: true, force: true });
    }
  });

  it("emits JSON-RPC error when session not configured", async () => {
    const fakeHome = mkdtempSync(join(tmpdir(), "gumpbox-proxy-"));
    try {
      const proc = startProxy(fakeHome);
      const resp = await sendRpc(proc, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      expect(resp.id).toBe(2);
      expect(resp.error).toBeDefined();
      expect(resp.error.code).toBe(-32001); // custom application code for session_not_configured
      expect(resp.error.message).toMatch(/session|configure/i);
      proc.kill();
    } finally {
      rmSync(fakeHome, { recursive: true, force: true });
    }
  });
});
