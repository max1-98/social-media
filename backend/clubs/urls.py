
# Django imports
from django.urls import path

# Club views
from .views import AllClubView, ClubDetailView, ClubUpdateView, ClubCreateView

# Member views
from .views import MembersListEventView, MemberAcceptView, MemberDeleteView, MemberRequestCreateView, MemberRequestDeleteView, MemberRequestListView
from .views import MemberAttendanceListView, CreateDummyUserView, MembersListView, MyClubsListView, AdminUpdateView

from .views import AddressToLngLatView, CreateSports, AddSport, ClubImageView, UpdateClubSocials, ClubSocialRetrieveView
urlpatterns = [
    # Club views
    path('clubs/', AllClubView.as_view()),
    path('clubs/<str:sport>/', AllClubView.as_view()),
    path('club/<int:pk>/', ClubDetailView.as_view()),
    path('club/my-clubs/', MyClubsListView.as_view()),
    

    # Club Member views
    path('club/request/create/', MemberRequestCreateView.as_view()),
    path('club/request/cancel/', MemberRequestDeleteView.as_view()),
    path('club/requests/<int:pk>/', MemberRequestListView.as_view()),
    path('club/members/<int:pk>/', MembersListView.as_view()),
    path('club/members/event/<int:pk1>/', MembersListEventView.as_view()),
    path('club/request-accept/<int:pk2>/<int:pk>/', MemberAcceptView.as_view()),
    path('club/member/<int:pk2>/<int:pk>/', MemberDeleteView.as_view()), # Deleteing a particular member
    path('club/member/<int:pk>/', MemberDeleteView.as_view()), # Deleting yourself (ie. leaving)
    path('member-attendance/', MemberAttendanceListView.as_view()),
    path('club/dummy-user/create/<int:pk>/', CreateDummyUserView.as_view()),
    path('club/make-admin/<int:pk2>/<int:pk>/', AdminUpdateView.as_view()),

    # Club to-do list
    path('club/edit/<int:pk>/', ClubUpdateView.as_view()),
    path('createclub/', ClubCreateView.as_view()),
    path('club/add-address/', AddressToLngLatView.as_view()),
    path('club/add-sport/', AddSport.as_view()),
    path('club/<int:pk>/logo/', ClubImageView.as_view(), name='club-logo-upload'),
    path('club/edit/socials/<int:pk>/', UpdateClubSocials.as_view(), name='club-edit-socials'),
    path('clubs/<int:pk>/socials/', ClubSocialRetrieveView.as_view(), name='club-socials-detail'),

    path("test/", CreateSports.as_view()),
]