import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";

// wraps the @gumpbox/mcp-proxy bin. host editor (cursor/continue/etc) talks
// JSON-RPC to this proc over stdio, proxy forwards to gumpbox HTTP MCP server.
export class McpProxyProcess {
  private proc: ChildProcessWithoutNullStreams | undefined;

  constructor(private readonly proxyBinPath: string) {}

  start(): void {
    if (this.proc) return;
    this.proc = spawn(this.proxyBinPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc.on("exit", (code) => {
      console.warn(`gumpbox-mcp-proxy exited with code ${code}`);
      this.proc = undefined;
    });
    this.proc.stderr?.on("data", (b) => {
      console.warn(`[gumpbox-mcp-proxy] ${b.toString()}`);
    });
  }

  stop(): void {
    this.proc?.kill();
    this.proc = undefined;
  }
}
