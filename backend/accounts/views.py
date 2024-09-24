# django imports
from django.contrib.auth import login
from django.http import JsonResponse

# rest_framework imports
from rest_framework import generics, authentication, permissions, status
from rest_framework.settings import api_settings
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view

# knox imports
from knox.views import LoginView as KnoxLoginView
from knox.auth import TokenAuthentication
from knox.models import AuthToken

# local apps import
from .serializers import CustomUserSerializer, AuthSerializer

@api_view(['POST'])
def verify_token(request):
    try:
        TokenAuthentication().authenticate(request)  # Attempt to authenticate
        return JsonResponse({'valid': True})
    except:
        return JsonResponse({'valid': False}, status=401)
    
class UserDetailView(generics.RetrieveAPIView):
    serializer_class = CustomUserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

class CreateUserView(generics.CreateAPIView):
    # Create user API view
    serializer_class = CustomUserSerializer


class LoginView(KnoxLoginView):
    # login view extending KnoxLoginView
    serializer_class = AuthSerializer
    permission_classes = (permissions.AllowAny,)

    def post(self, request, format=None):
        serializer = AuthTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return super(LoginView, self).post(request, format=None)    
    
class LogoutView(APIView):
    authentication_classes = (TokenAuthentication,)
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, format=None):
        # Simply delete the token associated with the user
        AuthToken.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ManageUserView(generics.RetrieveUpdateAPIView):
    """Manage the authenticated user"""
    serializer_class = CustomUserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        """Retrieve and return authenticated user"""
        return self.request.user