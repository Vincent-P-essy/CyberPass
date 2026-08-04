from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class RequestBodyTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    """Borne les corps, y compris chunked, avant l'analyse multipart des routes."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        content_length = Headers(scope=scope).get("Content-Length")
        if content_length:
            try:
                if int(content_length) > self.max_bytes:
                    response = JSONResponse(
                        status_code=413, content={"detail": "Corps de requête trop volumineux"}
                    )
                    await response(scope, receive, send)
                    return
            except ValueError:
                response = JSONResponse(
                    status_code=400, content={"detail": "Content-Length invalide"}
                )
                await response(scope, receive, send)
                return
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise RequestBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLarge:
            response = JSONResponse(
                status_code=413, content={"detail": "Corps de requête trop volumineux"}
            )
            await response(scope, receive, send)
