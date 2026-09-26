"""
WebSocket JWT authentication middleware.

Clients connect to /ws/... with a JWT in the query string, e.g.
    ws://localhost:8000/ws/incidents/?token=eyJ...
The middleware validates the token and attaches the User to the scope.
Unauthenticated connections are closed immediately.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from channels.sessions import CookieMiddleware, SessionMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _get_user_from_token(token_str):
    User = get_user_model()
    try:
        token = AccessToken(token_str)
        user_id = token.get("user_id")
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        if token:
            scope["user"] = await _get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        # Reject anonymous users
        if not scope["user"].is_authenticated:
            # Close the socket cleanly
            await send({"type": "websocket.close", "code": 4001})
            return

        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    """Compose JWT auth with cookie/session middleware."""
    return CookieMiddleware(SessionMiddleware(JwtAuthMiddleware(inner)))
