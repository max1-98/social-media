from django.urls import path
from .views import CreateUserView, ManageUserView, LogoutView, UserDetailView, SimpleProfileView
from .views import NavbarUserInfoView

app_name = 'accounts'

urlpatterns = [
    path('register/', CreateUserView.as_view(), name="create"),
    path('profile/', UserDetailView.as_view(), name='profile'),
    
    path('logout/', LogoutView.as_view(), name='logout'),
    
    path('profile/<int:pk>/', SimpleProfileView.as_view(), name='user-profile'),
    path('navbar_info/', NavbarUserInfoView.as_view(), name="navbar_info")
]
