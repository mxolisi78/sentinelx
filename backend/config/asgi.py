"""
ASGI config for SentinelX.

Routes HTTP to Django's regular view system, and WebSocket connections
to Channels consumers. JWT tokens are validated from the query string.
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

# Initialise Django before importing anything that touches models
django_asgi_app = get_asgi_application()

from detection.routing import websocket_urlpatterns  # noqa: E402
from detection.middleware import JwtAuthMiddlewareStack  # noqa: E402


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)
