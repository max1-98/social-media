
# Django imports
from django.urls import path

# Club views
from .views import AllClubView, ClubDetailView, ClubUpdateView, ClubCreateView

# Member views
from .views import MembersView, MemberAcceptView, MemberDeleteView, MemberRequestView, MemberRequestListView


urlpatterns = [
    path('clubs/', AllClubView.as_view()),
    path('createclub/', ClubCreateView.as_view()),
    path('club/<int:pk>/', ClubDetailView.as_view()),
    path('club/edit/<int:pk>/', ClubUpdateView.as_view()),
    path('club/request/', MemberRequestView.as_view()),
    path('club/requests/<int:pk>/', MemberRequestListView.as_view()),
    path('club/members/<int:pk>/', MembersView.as_view()),
    path('club/request-accept/<int:pk>/', MemberAcceptView.as_view()),
    path('club/member/<int:pk>/', MemberDeleteView.as_view())
]