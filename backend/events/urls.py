
# Django imports
from django.urls import path

# Event views
from .views import EventCreateView, EventsListView, EventView, ActivateMemberView, DectivateMemberView, StartEventView, CompleteEventView

urlpatterns = [
    # Club Event views
    path('club/events/<int:pk>/', EventsListView.as_view()),
    path('club/event/<int:pk>/', EventView.as_view()),
    path('club/event/create/<int:pk>/', EventCreateView.as_view()),
    path('club/event/activate-member/', ActivateMemberView.as_view(), name='activate-member'),
    path('club/event/deactivate-member/', DectivateMemberView.as_view(), name='deactivate-member'),
    path('club/event/start/', StartEventView.as_view(), name='start-event'),
    path('club/event/complete/', CompleteEventView.as_view(), name='start-event'),
]