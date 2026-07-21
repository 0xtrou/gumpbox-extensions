// JSON-RPC 2.0 — https://www.jsonrpc.org/specification
export interface JsonRPCRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown> | unknown[];
}

export interface JsonRPCErrorBody {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRPCResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: JsonRPCErrorBody;
}

// MCP server / tool shapes
export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
  capabilities?: Record<string, unknown>;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPResource {
  name: string;
  description?: string;
}

export interface MCPAction {
  name: string;
  description?: string;
}

export interface ToolResult {
  content?: Array<{ type: string; [k: string]: unknown }>;
  isError?: boolean;
  [k: string]: unknown;
}
