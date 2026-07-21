import { describe, it, expect } from "vitest";
import { GumpboxError } from "../src/errors.js";

describe("GumpboxError", () => {
  it("preserves code and message", () => {
    const err = new GumpboxError("session_invalid", "token rejected");
    expect(err.code).toBe("session_invalid");
    expect(err.message).toBe("token rejected");
    expect(err.name).toBe("GumpboxError");
    expect(err instanceof Error).toBe(true);
  });

  it("preserves httpStatus when provided", () => {
    const err = new GumpboxError("gumpbox_http_error", "bad gateway", 502);
    expect(err.httpStatus).toBe(502);
  });

  it("httpStatus defaults to undefined", () => {
    const err = new GumpboxError("gumpbox_unreachable", "conn refused");
    expect(err.httpStatus).toBeUndefined();
  });

  it("serializes to JSON cleanly", () => {
    const err = new GumpboxError("session_invalid", "x", 401);
    const pojo = JSON.parse(JSON.stringify(err));
    expect(pojo.code).toBe("session_invalid");
    expect(pojo.message).toBe("x");
    expect(pojo.httpStatus).toBe(401);
  });
});
