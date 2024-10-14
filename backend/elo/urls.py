from django.urls import path
from .views import EloListView

urlpatterns = [
    path('elos/<str:username>/', EloListView.as_view(), name='elo-list'),
]