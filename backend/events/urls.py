
# Django imports
from django.urls import path

# Event views
from .views import EventCreateView, EventsListView, EventView, ActivateMemberView, EventSettingsUpdateView
from .views import DectivateMemberView, StartEventView, CompleteEventView, MyEventsView, ActiveEventsView
from .views import EventStatsView
urlpatterns = [
    # Club Event views
    path('events/<int:pk>/', EventsListView.as_view()),
    path('event/<int:pk1>/', EventView.as_view()),
    path('event/create/<int:pk>/', EventCreateView.as_view()),
    path('event/activate-member/', ActivateMemberView.as_view(), name='activate-member'),
    path('event/deactivate-member/', DectivateMemberView.as_view(), name='deactivate-member'),
    path('event/start/', StartEventView.as_view(), name='start-event'),
    path('event/complete/', CompleteEventView.as_view(), name='start-event'),
    path('events/', MyEventsView.as_view()),
    path('events/active/',  ActiveEventsView.as_view()),
    path('event/settings/<int:pk1>/', EventSettingsUpdateView.as_view()),
    path('event/<int:pk1>/stats/', EventStatsView.as_view(), name='event-stats'),
]