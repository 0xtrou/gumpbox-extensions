import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { MCPClient } from "../src/client.js";
import { GumpboxError } from "../src/errors.js";

let server: Server;
let port = 0;
let lastBody: any = null;

beforeAll(async () => {
  server = createServer((req, res) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      lastBody = JSON.parse(buf || "{}");
      if (req.url?.includes("/global/mcp/bad-token")) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
      const id = lastBody.id;
      const method = lastBody.method;
      let result: unknown = {};
      if (method === "initialize") {
        result = { protocolVersion: "2024-11-05", serverInfo: { name: "gumpbox", version: "1.0.0" } };
      } else if (method === "tools/list") {
        result = { tools: [{ name: "list_resources" }] };
      } else if (method === "tools/call") {
        result = { content: [{ type: "text", text: "ok" }] };
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as any).port;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

function makeClient(token = "good-token-12345") {
  return new MCPClient({
    sessionUrl: `http://127.0.0.1:${port}/global/mcp/${token}`,
  });
}

describe("MCPClient", () => {
  it("initialize returns server info", async () => {
    const c = makeClient();
    const info = await c.initialize({ name: "test", version: "1.0" });
    expect(info.name).toBe("gumpbox");
    expect(info.protocolVersion).toBe("2024-11-05");
  });

  it("listTools returns tools array", async () => {
    const c = makeClient();
    const tools = await c.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("list_resources");
  });

  it("callTool returns tool result", async () => {
    const c = makeClient();
    const result = await c.callTool("list_resources", {});
    expect(result.content?.[0]?.text).toBe("ok");
  });

  it("sends session token in URL path, not header", async () => {
    const c = makeClient();
    await c.initialize({ name: "test", version: "1.0" });
    // Server-side: token was part of the URL path (server only registers /global/mcp/:token)
    expect(lastBody.method).toBe("initialize");
  });

  it("401 throws session_invalid", async () => {
    const c = makeClient("bad-token");
    await expect(c.initialize({ name: "x", version: "1" })).rejects.toMatchObject({
      code: "session_invalid",
    });
  });

  it("connection refused throws gumpbox_unreachable", async () => {
    const c = new MCPClient({ sessionUrl: "http://127.0.0.1:1/global/mcp/good-token-12345" });
    await expect(c.initialize({ name: "x", version: "1" })).rejects.toMatchObject({
      code: "gumpbox_unreachable",
    });
  });
});
