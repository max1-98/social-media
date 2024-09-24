# django imports
from django.http import Http404

# rest_framework imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status,  permissions
from rest_framework.exceptions import PermissionDenied

# knox imports
from knox.auth import TokenAuthentication

# local apps import
from .models import ClubModel
from .serializers import ClubSerializer
from accounts.models import CustomUser



class SimpleView(APIView):
    
    def get(self, request, format=None):
        clubs = ClubModel.objects.all()
        serializer = ClubSerializer(clubs, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        club_username = request.data['club_username']
        serializer = ClubSerializer(data=request.data)
        if serializer.is_valid():
            if CustomUser.objects.filter(username=club_username).exists() or ClubModel.objects.filter(club_username=club_username).exists():
                return Response({"error": "Club username already exists."}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer.save(president=request.user)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class SimpleDetail(APIView):
    """
    Retrieve, update or delete a snippet instance.
    """
    authentication_classes = (TokenAuthentication,)
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_object(self, pk):
        try:
            club = ClubModel.objects.get(pk=pk)
            # Check if the user is the club president
            if club.president.id == self.request.user.id:
                return club  # Return the club object if authorized
            else:
                raise PermissionDenied("You are not authorized to access this club.")
        except ClubModel.DoesNotExist:
            raise Http404
        except PermissionDenied as e:
            raise e

    def get(self, request, pk, format=None):
        
        club = self.get_object(pk)
        serializer = ClubSerializer(club)
        return Response(serializer.data)

    def put(self, request, pk, format=None):
        club = self.get_object(pk)
        serializer = ClubSerializer(club, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, format=None):
        User = request.user
        club = self.get_object(pk)
        print(User)
        if club.president.id == User.id:
            club.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return Response({"error": "You are not authorized to delete this club."}, status=status.HTTP_403_FORBIDDEN)