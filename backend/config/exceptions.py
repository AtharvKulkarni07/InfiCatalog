"""One consistent error envelope for every API failure:
{"error": {"code": "...", "message": "...", "details": {...}}}"""
import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled error in %s", context.get("view"))
        return Response(
            {"error": {"code": "server_error", "message": "Something went wrong on our side."}},
            status=500,
        )

    data = response.data
    if response.status_code == 400:
        code, message, details = "validation_error", "Some fields need your attention.", data
    else:
        detail = data.get("detail") if isinstance(data, dict) else None
        code = getattr(detail, "code", None) or "error"
        message = str(detail) if detail else "Request failed."
        details = None
    response.data = {"error": {"code": code, "message": message, "details": details}}
    return response
