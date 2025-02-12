from django.urls import path



from .views import PasswordResetRequestView, PasswordResetView, EmailVerifyRequestView, EmailVerifyView

app_name = 'authorization'

urlpatterns = [
    path('request_reset/', PasswordResetRequestView.as_view(), name="request_reset"),
    path('reset/', PasswordResetView.as_view(), name="reset-password"),
    path('request_verify/', EmailVerifyRequestView.as_view()),
    path('verify/', EmailVerifyView.as_view())
]