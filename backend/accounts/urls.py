from django.urls import path

from knox import views as knox_views

from .views import CreateUserView, LoginView, ManageUserView, LogoutView, UserDetailView

app_name = 'accounts'

urlpatterns = [
    path('register/', CreateUserView.as_view(), name="create"),
    path('profile/', UserDetailView.as_view(), name='profile'),
    path('login/', LoginView.as_view(), name='knox_login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('logoutall/', knox_views.LogoutAllView.as_view(), name='knox_logoutall'),
]
