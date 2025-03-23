import HttpStatusCode from "./status_code.ts";
import type {Context} from "hono";
import type {StatusCode} from "hono/dist/types/utils/http-status";

interface HTTPError {
	code: ErrorCode;
	message?: string;
}

enum ErrorCode {
	INTERNAL_SERVER_ERROR = HttpStatusCode.INTERNAL_SERVER_ERROR_500,
	INVALID_PARAMETER_ERROR = HttpStatusCode.BAD_REQUEST_400,
	FILE_TOO_LARGE_ERROR = HttpStatusCode.PAYLOAD_TOO_LARGE_413
}

interface ErrorCodeProperties {
	msg: string;
}

const errorCodeProperties : Record<ErrorCode, ErrorCodeProperties> = {
	[ErrorCode.INTERNAL_SERVER_ERROR]: {msg: "Internal server error"},
	[ErrorCode.INVALID_PARAMETER_ERROR]: {msg: "Invalid parameter"},
	[ErrorCode.FILE_TOO_LARGE_ERROR]: {msg: "File too large"}
}

export function onHttpError(error: Error, ctx: Context, requestId: string) {
	switch (error.constructor) {
		case InvalidParameterError:
			return errorResponse(ErrorCode.INVALID_PARAMETER_ERROR, ctx, error, requestId);
		default:
			return errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, ctx, error, requestId);
	}
}

function errorResponse(ec: ErrorCode, ctx: Context, cause: Error, requestId: string) {
	ctx.status(<StatusCode>ec)
	return ctx.json({code: ec, message: errorCodeProperties[ec].msg, requestId})
}

export class InvalidParameterError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidParameterError";
	}
}

export class FileTooLargeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FileTooLargeError";
	}
}
