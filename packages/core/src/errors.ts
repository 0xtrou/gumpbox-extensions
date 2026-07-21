export type GumpboxErrorCode =
  | "gumpbox_unreachable"
  | "session_invalid"
  | "session_not_configured"
  | "gumpbox_http_error";

export class GumpboxError extends Error {
  readonly code: GumpboxErrorCode;
  readonly httpStatus?: number;

  constructor(code: GumpboxErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "GumpboxError";
    this.code = code;
    this.httpStatus = httpStatus;
  }

  toJSON(): { code: GumpboxErrorCode; message: string; httpStatus?: number } {
    return {
      code: this.code,
      message: this.message,
      ...(this.httpStatus !== undefined && { httpStatus: this.httpStatus }),
    };
  }
}
