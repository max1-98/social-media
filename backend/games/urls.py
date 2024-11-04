from .views import SBMMCreateGameView, DeleteGameView, CompleteGameView, GameListView, EventGamesListView
from .views import UserGamesListView, SocialCreateGameView, PegPlayer1View, PegCreateGameView
from django.urls import path


urlpatterns = [
    # Game creation
    path('create-sbmm/', SBMMCreateGameView.as_view()),
    path('create-social/', SocialCreateGameView.as_view()),

        ## Peg creation views
    path('get-player_1/', PegPlayer1View.as_view()),
    path('create-peg/', PegCreateGameView.as_view()),

    # Deleting and completing games
    path('delete/', DeleteGameView.as_view()),
    path('complete/', CompleteGameView.as_view()),

    # Listing games
    path('games/<int:pk1>/', GameListView.as_view()),
    path('event/games/<int:pk1>/', EventGamesListView.as_view()),
    path('users/games/', UserGamesListView.as_view(), name='user-games'),
]