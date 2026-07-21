import { createInterface } from "node:readline";
import { MCPClient } from "./client.js";
import { GumpboxError } from "./errors.js";
import type { JsonRPCRequest, JsonRPCResponse } from "./types.js";
import type { SessionConfig } from "./session.js";

export interface StdioProxyOptions {
  clientName: string;
  clientVersion: string;
  getSessionConfig: () => Promise<SessionConfig | null>;
}

/**
 * JSON-RPC error codes we emit on stdio.
 * -32000 to -32099 is the application-defined range per JSON-RPC 2.0 spec.
 */
export const PROXY_ERROR_CODES = {
  session_not_configured: -32001,
  session_invalid: -32002,
  gumpbox_unreachable: -32003,
  gumpbox_http_error: -32004,
} as const;

/**
 * Reads newline-delimited JSON-RPC requests from stdin, forwards each to gumpbox
 * via MCPClient, writes each response as a single newline-delimited JSON object
 * to stdout. Session config is re-read on every request so URL changes take
 * effect without restarting the host.
 */
export async function runStdioProxy(options: StdioProxyOptions): Promise<void> {
  const rl = createInterface({ input: process.stdin });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let req: JsonRPCRequest;
    try {
      req = JSON.parse(trimmed);
    } catch {
      const resp: JsonRPCResponse = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      };
      process.stdout.write(JSON.stringify(resp) + "\n");
      continue;
    }

    let config: SessionConfig;
    try {
      const c = await options.getSessionConfig();
      if (!c) {
        throw new GumpboxError(
          "session_not_configured",
          "Run 'Gumpbox: Set Session URL' or 'npx @gumpbox/cli set-url'.",
        );
      }
      config = c;
    } catch (e) {
      const err = e instanceof GumpboxError ? e : new GumpboxError("session_not_configured", String(e));
      const resp: JsonRPCResponse = {
        jsonrpc: "2.0",
        id: req.id,
        error: { code: PROXY_ERROR_CODES[err.code], message: err.message },
      };
      process.stdout.write(JSON.stringify(resp) + "\n");
      continue;
    }

    const client = new MCPClient(config);
    try {
      const httpResp = await client.rpc(req.method, (req.params ?? {}) as Record<string, unknown>);
      // Rewrite the id back to the stdio client's original id — client.rpc()
      // generates its own UUID for the HTTP hop, but the host on stdio expects
      // to see the id it sent.
      const resp: JsonRPCResponse = { ...httpResp, id: req.id };
      process.stdout.write(JSON.stringify(resp) + "\n");
    } catch (e) {
      const err = e instanceof GumpboxError ? e : new GumpboxError("gumpbox_http_error", String(e));
      const resp: JsonRPCResponse = {
        jsonrpc: "2.0",
        id: req.id,
        error: { code: PROXY_ERROR_CODES[err.code], message: err.message },
      };
      process.stdout.write(JSON.stringify(resp) + "\n");
    }
  }
}
