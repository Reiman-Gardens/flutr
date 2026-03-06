import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface ErrorDetail {
  path: string;
  message: string;
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

function formatZodPath(segments: (string | number)[]): string {
  let result = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (typeof seg === "number") {
      result += `[${seg}]`;
    } else {
      result += i > 0 ? `.${seg}` : seg;
    }
  }
  return result;
}

export function jsonError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: ErrorDetail[],
) {
  const body: ErrorBody = {
    error: {
      code,
      message,
      ...(details && details.length ? { details } : {}),
    },
  };

  return NextResponse.json(body, { status });
}

export function unauthorized(message = "Unauthorized") {
  return jsonError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Forbidden") {
  return jsonError("FORBIDDEN", message, 403);
}

export function invalidRequest(message = "Invalid request", issues?: ZodError["issues"]) {
  const details =
    issues?.map((issue) => ({
      path: formatZodPath(issue.path as (string | number)[]),
      message: issue.message,
    })) ?? [];

  return jsonError("INVALID_REQUEST", message, 400, details);
}

export function notFound(message = "Not found") {
  return jsonError("NOT_FOUND", message, 404);
}

export function conflict(message = "Conflict") {
  return jsonError("CONFLICT", message, 409);
}

export function internalError(message = "Internal server error") {
  return jsonError("INTERNAL_ERROR", message, 500);
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
