
# Django imports
from django.urls import path

# Event views
from .views import EventCreateView, EventsListView, EventView, ActivateMemberView, EventSettingsUpdateView
from .views import DectivateMemberView, StartEventView, CompleteEventView, UpcomingEventView, ActiveEventsView
from .views import EventStatsView

urlpatterns = [
    # Club Event views
    path('club/events/<int:pk>/', EventsListView.as_view()),
    path('club/event/<int:pk1>/', EventView.as_view()),
    path('club/event/create/<int:pk>/', EventCreateView.as_view()),
    path('club/event/activate-member/', ActivateMemberView.as_view(), name='activate-member'),
    path('club/event/deactivate-member/', DectivateMemberView.as_view(), name='deactivate-member'),
    path('club/event/start/', StartEventView.as_view(), name='start-event'),
    path('club/event/complete/', CompleteEventView.as_view(), name='start-event'),
    path('club/events/upcoming/', UpcomingEventView.as_view()),
    path('club/events/active/',  ActiveEventsView.as_view()),
    path('club/event/settings/<int:pk1>/', EventSettingsUpdateView.as_view()),
    path('club/event/<int:pk1>/stats/', EventStatsView.as_view(), name='event-stats'),
]