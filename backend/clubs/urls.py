
# Django imports
from django.urls import path

# Club views
from .views import AllClubView, ClubDetailView, ClubUpdateView, ClubCreateView

# Member views
from .views import MembersView, MemberAcceptView, MemberDeleteView, MemberRequestCreateView, MemberRequestDeleteView, MemberRequestListView

# Event views
from .views import EventCreateView, EventsListView, EventView, ActivateMemberView, DectivateMemberView, StartEventView, CompleteEventView


urlpatterns = [
    # Club views
    path('clubs/', AllClubView.as_view()),
    path('createclub/', ClubCreateView.as_view()),
    path('club/<int:pk>/', ClubDetailView.as_view()),
    path('club/edit/<int:pk>/', ClubUpdateView.as_view()),

    # Club Event views
    path('club/events/<int:pk>/', EventsListView.as_view()),
    path('club/event/<int:pk>/', EventView.as_view()),
    path('club/event/create/<int:pk>/', EventCreateView.as_view()),
    path('club/event/activate-member/', ActivateMemberView.as_view(), name='activate-member'),
    path('club/event/deactivate-member/', DectivateMemberView.as_view(), name='deactivate-member'),
    path('club/event/start/', StartEventView.as_view(), name='start-event'),
    path('club/event/complete/', CompleteEventView.as_view(), name='start-event'),
    

    # Club Member views
    path('club/request/create/', MemberRequestCreateView.as_view()),
    path('club/request/cancel/', MemberRequestDeleteView.as_view()),
    path('club/requests/<int:pk>/', MemberRequestListView.as_view()),
    path('club/members/<int:pk>/', MembersView.as_view()),
    path('club/request-accept/<int:pk>/', MemberAcceptView.as_view()),
    path('club/member/<int:pk>/', MemberDeleteView.as_view()),
]