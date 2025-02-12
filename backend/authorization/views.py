
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from tasks.tasks import send_password_reset_email, send_verify_email_email, send_verify_complete_email
from django.utils.crypto import get_random_string
from .models import PasswordReset, EmailVerify
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from datetime import datetime, timedelta
from backend.settings import EMAIL_HOST_USER
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

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
        except Exception as e:
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
        except:
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
        except Exception as e:
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
        except Exception as e:
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
        except:
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
        