from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import UserSerializer, SentinelXTokenObtainPairSerializer
from .permissions import IsAdmin


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]


class SentinelXLoginView(TokenObtainPairView):
    serializer_class = SentinelXTokenObtainPairSerializer