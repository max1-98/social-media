# django imports
from django.contrib.auth import login
from django.http import JsonResponse

# rest_framework imports
from rest_framework import generics, authentication, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view

# local apps import
from .serializers import CustomUserSerializer, SimpleUserSerializer, NavbarUserInfoSerializer
from .models import CustomUser


class UserDetailView(generics.RetrieveAPIView):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        print(self.request.headers)
        return self.request.user
    
class NavbarUserInfoView(generics.RetrieveAPIView):
    serializer_class = NavbarUserInfoSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        
        return self.request.user

class SimpleProfileView(generics.RetrieveAPIView):
    serializer_class = SimpleUserSerializer

    def get_object(self):
        pk = self.kwargs.get('pk')
        return CustomUser.objects.get(pk=pk)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
class CreateUserView(generics.CreateAPIView):
    # Create user API view
    serializer_class = CustomUserSerializer

class LogoutView(APIView):
    #authentication_classes = (TokenAuthentication,)
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, format=None):
        # Simply delete the token associated with the user
        #AuthToken.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
