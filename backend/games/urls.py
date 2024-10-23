from .views import SBMMCreateGameView, DeleteGameView, CompleteGameView, GameListView, EventGamesListView
from django.urls import path


urlpatterns = [
    path('create/', SBMMCreateGameView.as_view()),
    path('delete/', DeleteGameView.as_view()),
    path('complete/', CompleteGameView.as_view()),
    path('games/<int:pk1>/', GameListView.as_view()),
    path('event/games/<int:pk1>/', EventGamesListView.as_view()),
]