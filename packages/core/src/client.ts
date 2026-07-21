import { GumpboxError } from "./errors.js";
import type {
  JsonRPCRequest,
  JsonRPCResponse,
  MCPAction,
  MCPResource,
  MCPServerInfo,
  MCPTool,
  ToolResult,
} from "./types.js";
import type { SessionConfig } from "./session.js";

export interface ClientInfo {
  name: string;
  version: string;
}

export class MCPClient {
  private readonly sessionUrl: string;
  private initialized = false;

  constructor(config: SessionConfig) {
    this.sessionUrl = config.sessionUrl;
  }

  async initialize(clientInfo: ClientInfo): Promise<MCPServerInfo> {
    const resp = await this.rpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo,
    });
    const result = resp.result as {
      protocolVersion?: string;
      serverInfo?: { name?: string; version?: string };
      capabilities?: Record<string, unknown>;
    };
    this.initialized = true;
    return {
      name: result.serverInfo?.name ?? "unknown",
      version: result.serverInfo?.version ?? "0.0.0",
      protocolVersion: result.protocolVersion,
      capabilities: result.capabilities,
    };
  }

  async listTools(): Promise<MCPTool[]> {
    const resp = await this.rpc("tools/list", {});
    const result = resp.result as { tools?: MCPTool[] };
    return result.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const resp = await this.rpc("tools/call", { name, arguments: args });
    return resp.result as ToolResult;
  }

  async listResources(): Promise<MCPResource[]> {
    const resp = await this.rpc("tools/call", { name: "list_resources", arguments: {} });
    const result = resp.result as { content?: Array<{ type: string; text?: string }> };
    const text = result.content?.[0]?.text ?? "[]";
    try {
      return JSON.parse(text) as MCPResource[];
    } catch {
      return [];
    }
  }

  async listResourceActions(resource: string): Promise<MCPAction[]> {
    const resp = await this.rpc("tools/call", {
      name: "list_resource_actions",
      arguments: { resource },
    });
    const result = resp.result as { content?: Array<{ type: string; text?: string }> };
    const text = result.content?.[0]?.text ?? "[]";
    try {
      return JSON.parse(text) as MCPAction[];
    } catch {
      return [];
    }
  }

  async getResourceActionSchema(resource: string, action: string): Promise<Record<string, unknown>> {
    const resp = await this.rpc("tools/call", {
      name: "get_resource_action_schema",
      arguments: { resource, action },
    });
    const result = resp.result as { content?: Array<{ type: string; text?: string }> };
    const text = result.content?.[0]?.text ?? "{}";
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async invokeResourceAction(
    resource: string,
    action: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const resp = await this.rpc("tools/call", {
      name: "invoke_resource_action",
      arguments: { resource, action, ...params },
    });
    return resp.result;
  }

  /**
   * Low-level JSON-RPC call. Public so proxy.ts can forward arbitrary methods.
   */
  async rpc(method: string, params: Record<string, unknown> | unknown[]): Promise<JsonRPCResponse> {
    const id = crypto.randomUUID();
    const body: JsonRPCRequest = { jsonrpc: "2.0", id, method, params };

    let httpResp: Response;
    try {
      httpResp = await fetch(this.sessionUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (/ECONNREFUSED|fetch failed|connect/i.test(msg)) {
        throw new GumpboxError("gumpbox_unreachable", `Cannot reach gumpbox at ${this.sessionUrl}: ${msg}`);
      }
      throw new GumpboxError("gumpbox_unreachable", `Network error: ${msg}`);
    }

    if (httpResp.status === 401 || httpResp.status === 403 || httpResp.status === 404) {
      const text = await httpResp.text().catch(() => "");
      throw new GumpboxError(
        "session_invalid",
        `Session rejected (HTTP ${httpResp.status}). Re-copy the session URL from gumpbox. ${text}`.trim(),
        httpResp.status,
      );
    }
    if (!httpResp.ok) {
      const text = await httpResp.text().catch(() => "");
      throw new GumpboxError(
        "gumpbox_http_error",
        `gumpbox returned HTTP ${httpResp.status}: ${text}`.trim(),
        httpResp.status,
      );
    }

    const contentType = httpResp.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return await this.readSSEResponse(httpResp, id);
    }
    const json = (await httpResp.json()) as JsonRPCResponse;
    return json;
  }

  private async readSSEResponse(resp: Response, expectedId: string | number | null): Promise<JsonRPCResponse> {
    // Parse a single-shot SSE response (data: <json>\n\n) — gumpbox's current shape.
    // We don't yet implement long-lived SSE because gumpbox emits single-shot today.
    const text = await resp.text();
    const lines = text.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload) as JsonRPCResponse;
        if (parsed.id === expectedId) return parsed;
      } catch {
        // skip non-JSON keepalive
      }
    }
    throw new GumpboxError("gumpbox_http_error", "SSE response did not contain expected message");
  }
}
