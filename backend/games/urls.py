from .views import CreateGameView, DeleteGameView, CompleteGameView, GameListView
from django.urls import path


urlpatterns = [
    path('create/', CreateGameView.as_view()),
    path('delete/', DeleteGameView.as_view()),
    path('complete/', CompleteGameView.as_view()),
    path('games/<int:pk>/', GameListView.as_view()),
]