
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model, authenticate
from django.conf import settings
from tasks.tasks import send_password_reset_email, send_verify_email_email, send_verify_complete_email
from django.utils.crypto import get_random_string
from .models import PasswordReset, EmailVerify
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, DatabaseError
from datetime import datetime, timedelta
from backend.settings import EMAIL_HOST_USER
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from oauth2_provider.models import get_application_model, AccessToken, RefreshToken
from oauthlib.common import generate_token
import logging

logger = logging.getLogger(__name__)

# View for making a request to reset password (Step 1)
class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')

        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = get_user_model().objects.get(email=email)
        except ObjectDoesNotExist:
            return Response({'detail': 'Account with this email does not exist.'}, status=status.HTTP_404_NOT_FOUND)


        # Generate a unique token
        token = get_random_string(length=32)

        # Create a PasswordReset instance
        try:
            password_reset = PasswordReset.objects.create(
                user=user,
                token=token,
                creation_time=timezone.now(),
            )
        except (IntegrityError, ValidationError) as e:
            return Response({'detail': f'Error creating password reset entry: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        send_password_reset_email.delay(
            "Reset Password",
            "Use this link to reset your password: localhost:3000/account/reset-password/"+str(token),
            EMAIL_HOST_USER,
            email,
            fail_silently=False,
        )
        """
            - Send an email containing a link to reset the password
            - This link goes to a frontend page designed for this, with two fields for password
            - include the token in the params of the link
            - create view for checking if a PasswordChange model with that token exists, and if it wasn't created too long ago
            - If so then check the passwords are valid and change the password
        """

        return Response({'detail': 'Password reset email sent.'}, status=status.HTTP_200_OK)
    
# View for sending the new password (two passwords must be received which must match) (Step 2)
class PasswordResetView(APIView):

    def post(self, request):
        password1 = request.data.get('password1')
        password2 = request.data.get('password2')
        
        ### If the frontend is built correctly this should never need to be called
        if not password1 or not password2:
            return Response({'detail': 'Please enter two valid passwords and ensure they match to confirm the change.'}, status=status.HTTP_400_BAD_REQUEST)

        ### Frontend should prevent this being called
        if (password1 != password2):
             return Response({'detail': 'The passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Checks if the token was included in the Post request
        token = request.data.get('password_token')
        if not token:
            return Response({'detail': 'Please send another request to reset your password.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Tries to collect the PasswordReset object, returns expiration response if it doesn't exist.
        try:
            password_reset = PasswordReset.objects.get(token=token)
        except PasswordReset.DoesNotExist:
            return Response({'detail': 'Password reset has expired. Please request again.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            validate_password(password1, password_reset.user)
        except ValidationError as e:

            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        creation_time = password_reset.creation_time
        three_hours_later = creation_time + timedelta(hours=3)
        now = datetime.now(creation_time.tzinfo) # Use the same timezone as creation_time
        if not (three_hours_later > now):
            return Response({'detail': 'Password reset has expired. Please request again.'}, status=status.HTTP_400_BAD_REQUEST)
        
        
        # Resets password as password and deleted PasswordReset object
        try:
            password_reset.user.set_password(password1)
            password_reset.user.save()
            password_reset.delete()
            return Response({'detail': 'Password successfully updated.'}, status=status.HTTP_200_OK)
        except (IntegrityError, DatabaseError) as e:
            return Response({'detail': 'An error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Request to send a verification email (Step 1)
class EmailVerifyRequestView(APIView):
    def post(self, request):

        user = request.user
        email = request.data.get('email')

        if not (user or email):
            return Response({'detail': 'Please log in or enter a valid email.'}, status=status.HTTP_400_BAD_REQUEST)


        token = get_random_string(length=32)

        if email:
            try:
                user = get_user_model().objects.get(email=email)
            except ObjectDoesNotExist:
                return Response({'detail': 'Account with this email does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        # Create a Email Verify instance
        try:
            email_verify = EmailVerify.objects.create(
                user=user,
                token=token,
                creation_time=timezone.now(),
            )
        except (IntegrityError, ValidationError) as e:
            return Response({'detail': f'Error creating verify email entry: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        task = send_verify_email_email.delay(
            "Verify Email",
            "Use this link to reset your password: localhost:3000/account/verify_email/"+str(token),
            EMAIL_HOST_USER,
            user.email,
            fail_silently=False,
        )

        return Response({'task_id': task.id }, status=status.HTTP_200_OK)

# Receives POST request from verify page (Step 2)
class EmailVerifyView(APIView):

    def post(self, request):

        token = request.data.get('email_token')

        if not token:
            return Response({'detail': 'Please send another request to verify your email.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Tries to collect the EmailVerify object, returns expiration response if it doesn't exist.
        try:
            email_verify = EmailVerify.objects.get(token=token)
        except EmailVerify.DoesNotExist:
            return Response({'detail': 'Email verify has expired. Please request again.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check whether the EmailVerify object has expired (3 hours expiration time)
        creation_time = email_verify.creation_time
        three_hours_later = creation_time + timedelta(hours=3)
        now = datetime.now(creation_time.tzinfo) # Use the same timezone as creation_time
        if not (three_hours_later > now):
            return Response({'detail': 'Email verify has expired. Please request again.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = email_verify.user
        user.email_verify = True
        send_verify_complete_email.delay(
            "Verify complete",
            "Thank you for verifying your email.",
            EMAIL_HOST_USER,
            user.email,
            fail_silently=False,
        )
        user.save()
        email_verify.delete()

        return Response({'detail': 'Email successfully verified.'}, status=status.HTTP_200_OK)


def _set_token_cookies(response, access_token, refresh_token):
    """Set httpOnly cookies for access and refresh tokens."""
    access_max_age = settings.OAUTH2_PROVIDER.get('ACCESS_TOKEN_EXPIRE_SECONDS', 360000)
    refresh_max_age = settings.OAUTH2_PROVIDER.get('REFRESH_TOKEN_EXPIRE_SECONDS', 2592000)
    secure = not settings.DEBUG

    response.set_cookie(
        'access_token',
        access_token,
        max_age=access_max_age,
        httponly=True,
        secure=secure,
        samesite='Lax',
        path='/',
    )
    response.set_cookie(
        'refresh_token',
        refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        secure=secure,
        samesite='Lax',
        path='/',
    )
    return response


def _get_oauth_application():
    """Get the OAuth application using configured client_id."""
    Application = get_application_model()
    return Application.objects.get(client_id=settings.OAUTH_CLIENT_ID)


class AuthProxyLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request=request, username=username, password=password)
        if not user:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            app = _get_oauth_application()
        except get_application_model().DoesNotExist:
            logger.error('OAuth application not found for client_id: %s', settings.OAUTH_CLIENT_ID)
            return Response(
                {'error': 'Authentication service unavailable.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        access_expire = timezone.now() + timedelta(
            seconds=settings.OAUTH2_PROVIDER.get('ACCESS_TOKEN_EXPIRE_SECONDS', 360000)
        )
        access_token = AccessToken.objects.create(
            user=user,
            application=app,
            token=generate_token(),
            expires=access_expire,
            scope='read write',
        )
        refresh_token = RefreshToken.objects.create(
            user=user,
            application=app,
            token=generate_token(),
            access_token=access_token,
        )

        response = Response({
            'user': {'id': user.id, 'username': user.username},
        })
        return _set_token_cookies(response, access_token.token, refresh_token.token)


class AuthProxyLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        access_token_str = request.COOKIES.get('access_token')

        if access_token_str:
            try:
                token = AccessToken.objects.get(token=access_token_str)
                # Delete associated refresh tokens first
                RefreshToken.objects.filter(access_token=token).delete()
                token.delete()
            except AccessToken.DoesNotExist:
                pass

        response = Response({'detail': 'Logged out.'})
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        return response


class AuthProxyRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token_str = request.COOKIES.get('refresh_token')

        if not refresh_token_str:
            return Response(
                {'error': 'No refresh token provided.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh_token = RefreshToken.objects.select_related(
                'user', 'application'
            ).get(token=refresh_token_str, revoked__isnull=True)
        except RefreshToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Revoke old access token
        old_access = refresh_token.access_token
        if old_access:
            old_access.delete()

        # Create new access token
        access_expire = timezone.now() + timedelta(
            seconds=settings.OAUTH2_PROVIDER.get('ACCESS_TOKEN_EXPIRE_SECONDS', 360000)
        )
        new_access_token = AccessToken.objects.create(
            user=refresh_token.user,
            application=refresh_token.application,
            token=generate_token(),
            expires=access_expire,
            scope='read write',
        )

        # Update refresh token to point to new access token
        refresh_token.access_token = new_access_token
        refresh_token.save()

        response = Response({
            'user': {'id': refresh_token.user.id, 'username': refresh_token.user.username},
        })
        secure = not settings.DEBUG
        access_max_age = settings.OAUTH2_PROVIDER.get('ACCESS_TOKEN_EXPIRE_SECONDS', 360000)
        response.set_cookie(
            'access_token',
            new_access_token.token,
            max_age=access_max_age,
            httponly=True,
            secure=secure,
            samesite='Lax',
            path='/',
        )
        return response
