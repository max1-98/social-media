from django.urls import path
from .views import SimpleView, SimpleDetail

urlpatterns = [
    path('clubs/', SimpleView.as_view()),
    path('club/<int:pk>/', SimpleDetail.as_view()),
]