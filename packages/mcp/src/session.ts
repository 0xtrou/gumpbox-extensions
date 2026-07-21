import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { GumpboxError } from "./errors.js";

export interface SessionConfig {
  sessionUrl: string;
}

/** Path to ~/.gumpbox/session.json on POSIX, %USERPROFILE%\.gumpbox\session.json on Windows. */
export function getSessionConfigPath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
  return join(home, ".gumpbox", "session.json");
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateSessionUrl(url: string): ValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "Malformed URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: "Scheme must be http or https." };
  }
  const host = parsed.hostname;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    return { valid: false, reason: "Host must be loopback (127.0.0.1, localhost, or ::1)." };
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 3 || parts[0] !== "global" || parts[1] !== "mcp") {
    return { valid: false, reason: "Path must be /global/mcp/<token>." };
  }
  const token = parts[2];
  if (!token) {
    return { valid: false, reason: "Session token segment missing." };
  }
  return { valid: true };
}

export function readSessionConfig(): SessionConfig | null {
  const path = getSessionConfigPath();
  if (!existsSync(path)) return null;

  if (process.platform !== "win32") {
    const stat = statSync(path);
    const mode = stat.mode & 0o777;
    if (mode !== 0o600) {
      throw new GumpboxError(
        "session_not_configured",
        `session.json perms are 0o${mode.toString(8)} — expected 0o600. Refusing to read world/group-readable file.`,
      );
    }
  }

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    throw new GumpboxError("session_not_configured", `Cannot read session.json: ${(e as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).sessionUrl !== "string"
  ) {
    return null;
  }
  const sessionUrl = (parsed as { sessionUrl: string }).sessionUrl;
  const v = validateSessionUrl(sessionUrl);
  if (!v.valid) return null;
  return { sessionUrl };
}

export function writeSessionConfig(config: SessionConfig): void {
  const v = validateSessionUrl(config.sessionUrl);
  if (!v.valid) {
    throw new GumpboxError("session_not_configured", `Invalid session URL: ${v.reason}`);
  }
  const path = getSessionConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf8");
  if (process.platform !== "win32") {
    chmodSync(path, 0o600);
  }
}
