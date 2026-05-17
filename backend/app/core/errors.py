import logging
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger(__name__)

DEFAULT_ERROR_CODES = {
    status.HTTP_400_BAD_REQUEST: "bad_request",
    status.HTTP_401_UNAUTHORIZED: "unauthorized",
    status.HTTP_403_FORBIDDEN: "forbidden",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_409_CONFLICT: "conflict",
    status.HTTP_410_GONE: "gone",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "validation_error",
    status.HTTP_429_TOO_MANY_REQUESTS: "rate_limited",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "internal_server_error",
    status.HTTP_503_SERVICE_UNAVAILABLE: "service_unavailable",
}

DEFAULT_ERROR_MESSAGES = {
    status.HTTP_400_BAD_REQUEST: "Request is invalid.",
    status.HTTP_401_UNAUTHORIZED: "Authentication is required.",
    status.HTTP_403_FORBIDDEN: "You do not have permission to perform this action.",
    status.HTTP_404_NOT_FOUND: "Resource not found.",
    status.HTTP_405_METHOD_NOT_ALLOWED: "HTTP method is not allowed for this resource.",
    status.HTTP_409_CONFLICT: "Request conflicts with the current resource state.",
    status.HTTP_410_GONE: "Resource is no longer available.",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "Request validation failed.",
    status.HTTP_429_TOO_MANY_REQUESTS: "Too many requests. Please retry later.",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "An unexpected server error occurred.",
    status.HTTP_503_SERVICE_UNAVAILABLE: "Service is temporarily unavailable.",
}


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


def api_error(
    status_code: int,
    code: str,
    message: str,
    details: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={
            "code": code,
            "message": message,
            "details": details,
        },
        headers=headers,
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_exception_handler)
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)


def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


def error_payload(
    request: Request,
    status_code: int,
    message: str | None = None,
    code: str | None = None,
    details: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "error": {
            "code": code or DEFAULT_ERROR_CODES.get(status_code, "error"),
            "message": message or DEFAULT_ERROR_MESSAGES.get(status_code, "Request failed."),
            "status": status_code,
            "request_id": get_request_id(request),
            "path": request.url.path,
            "details": details or [],
        }
    }


def json_error_response(
    request: Request,
    status_code: int,
    message: str | None = None,
    code: str | None = None,
    details: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    response = JSONResponse(
        status_code=status_code,
        content=error_payload(request, status_code, message, code, details),
        headers=headers,
    )
    response.headers["X-Request-ID"] = get_request_id(request)
    return response


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code = DEFAULT_ERROR_CODES.get(exc.status_code, "http_error")
    message = DEFAULT_ERROR_MESSAGES.get(exc.status_code, "Request failed.")
    details: list[dict[str, Any]] | None = None

    if isinstance(exc.detail, dict):
        code = str(exc.detail.get("code") or code)
        message = str(exc.detail.get("message") or message)
        raw_details = exc.detail.get("details")
        if isinstance(raw_details, list):
            details = raw_details
    elif isinstance(exc.detail, str) and exc.detail:
        message = exc.detail

    return json_error_response(
        request=request,
        status_code=exc.status_code,
        message=message,
        code=code,
        details=details,
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in error.get("loc", [])),
            "message": error.get("msg", "Invalid value."),
            "type": error.get("type", "validation_error"),
        }
        for error in exc.errors()
    ]
    return json_error_response(
        request=request,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code="validation_error",
        message="Request validation failed.",
        details=details,
    )


async def integrity_exception_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning("Database integrity error: %s", exc, exc_info=True)
    return json_error_response(
        request=request,
        status_code=status.HTTP_409_CONFLICT,
        code="resource_conflict",
        message="Request conflicts with existing data.",
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.exception("Database error: %s", exc)
    return json_error_response(
        request=request,
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        code="database_unavailable",
        message="Database is temporarily unavailable. Please retry shortly.",
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API error: %s", exc)
    return json_error_response(
        request=request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="internal_server_error",
        message="An unexpected server error occurred.",
    )
