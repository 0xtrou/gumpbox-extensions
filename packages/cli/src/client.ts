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

/** HTTP MCP client. One instance per session URL; safe to reuse across calls. */
export class MCPClient {
  private readonly sessionUrl: string;

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
    return this.textCall("list_resources", {});
  }

  async listResourceActions(resource: string): Promise<MCPAction[]> {
    return this.textCall("list_resource_actions", { resource });
  }

  async getResourceActionSchema(resource: string, action: string): Promise<Record<string, unknown>> {
    const result = await this.textCallRaw("get_resource_action_schema", { resource, action });
    try {
      return JSON.parse(result) as Record<string, unknown>;
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

  /** Low-level JSON-RPC. Public so callers can invoke arbitrary methods. */
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
    return (await httpResp.json()) as JsonRPCResponse;
  }

  private async textCallRaw(toolName: string, args: Record<string, unknown>): Promise<string> {
    const resp = await this.rpc("tools/call", { name: toolName, arguments: args });
    const result = resp.result as { content?: Array<{ type: string; text?: string }> };
    return result.content?.[0]?.text ?? "";
  }

  private async textCall<T>(toolName: string, args: Record<string, unknown>): Promise<T[]> {
    const text = await this.textCallRaw(toolName, args);
    try {
      return JSON.parse(text) as T[];
    } catch {
      return [];
    }
  }

  private async readSSEResponse(resp: Response, expectedId: string | number | null): Promise<JsonRPCResponse> {
    const text = await resp.text();
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload) as JsonRPCResponse;
        if (parsed.id === expectedId) return parsed;
      } catch {
        // skip keepalive / non-JSON
      }
    }
    throw new GumpboxError("gumpbox_http_error", "SSE response did not contain expected message");
  }
}
