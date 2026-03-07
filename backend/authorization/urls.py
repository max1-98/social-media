from django.urls import path



from .views import (
    PasswordResetRequestView, PasswordResetView,
    EmailVerifyRequestView, EmailVerifyView,
    AuthProxyLoginView, AuthProxyLogoutView, AuthProxyRefreshView,
)

app_name = 'authorization'

urlpatterns = [
    path('request_reset/', PasswordResetRequestView.as_view(), name="request_reset"),
    path('reset/', PasswordResetView.as_view(), name="reset-password"),
    path('request_verify/', EmailVerifyRequestView.as_view()),
    path('verify/', EmailVerifyView.as_view()),
    path('proxy-login/', AuthProxyLoginView.as_view(), name='proxy-login'),
    path('proxy-logout/', AuthProxyLogoutView.as_view(), name='proxy-logout'),
    path('proxy-refresh/', AuthProxyRefreshView.as_view(), name='proxy-refresh'),
]