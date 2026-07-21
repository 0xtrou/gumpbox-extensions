import { createInterface } from "node:readline";
import { MCPClient } from "./client.js";
import { GumpboxError } from "./errors.js";
import type { JsonRPCRequest, JsonRPCResponse } from "./types.js";
import type { SessionConfig } from "./session.js";

export interface StdioProxyOptions {
  clientName: string;
  clientVersion: string;
  getSessionConfig: () => SessionConfig | null | Promise<SessionConfig | null>;
}

/** JSON-RPC error codes we emit on stdio. -32000 to -32099 is app-defined per JSON-RPC 2.0. */
export const PROXY_ERROR_CODES = {
  session_not_configured: -32001,
  session_invalid: -32002,
  gumpbox_unreachable: -32003,
  gumpbox_http_error: -32004,
} as const;

/**
 * Reads newline-delimited JSON-RPC requests from stdin, forwards each to gumpbox
 * via MCPClient, writes each response as one newline-delimited JSON object to stdout.
 * Session config is re-read on every request so URL changes take effect without restart.
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
      write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      continue;
    }

    let config: SessionConfig;
    try {
      const c = await options.getSessionConfig();
      if (!c) {
        throw new GumpboxError(
          "session_not_configured",
          "Run 'gumpbox set-url' to configure your session URL.",
        );
      }
      config = c;
    } catch (e) {
      const err = e instanceof GumpboxError ? e : new GumpboxError("session_not_configured", String(e));
      write({ jsonrpc: "2.0", id: req.id, error: { code: PROXY_ERROR_CODES[err.code], message: err.message } });
      continue;
    }

    const client = new MCPClient(config);
    try {
      const httpResp = await client.rpc(req.method, (req.params ?? {}) as Record<string, unknown>);
      write({ ...httpResp, id: req.id });
    } catch (e) {
      const err = e instanceof GumpboxError ? e : new GumpboxError("gumpbox_http_error", String(e));
      write({ jsonrpc: "2.0", id: req.id, error: { code: PROXY_ERROR_CODES[err.code], message: err.message } });
    }
  }
}

function write(resp: JsonRPCResponse): void {
  process.stdout.write(JSON.stringify(resp) + "\n");
}
