from celery import shared_task
from datetime import datetime, timedelta
from django.core.mail import send_mail
from authorization.models import EmailVerify, PasswordReset
from oauth2_provider.models import AccessToken, RefreshToken
from backend.settings import OAUTH2_PROVIDER
from celery.signals import task_postrun
from .consumers import notify_channel_layer
import time
@shared_task(name='high_priority:reset_password')
def send_password_reset_email(title, body, EMAIL_HOST_USER, email, fail_silently=False):
    send_mail(
        title,
        body,
        EMAIL_HOST_USER,
        [email],
        fail_silently=fail_silently,
    )
    return True


@shared_task(name='high_priority:verify_email')
def send_verify_email_email(title, body, EMAIL_HOST_USER, email, fail_silently=False):
    
    send_mail(
        title,
        body,
        EMAIL_HOST_USER,
        [email],
        fail_silently=fail_silently,
    )
    return True

@shared_task(name='low_priority:verify_complete')
def send_verify_complete_email(title, body, EMAIL_HOST_USER, email, fail_silently=False):
    send_mail(
        title,
        body,
        EMAIL_HOST_USER,
        [email],
        fail_silently=fail_silently,
    )
    return True

@shared_task(name='low_priority:clear_email_verify')
def clear_email_verify():

    # Get the current time
    now = datetime.now()

    # Filter EmailVerify objects where creation_time is more than 3 hours ago
    expired_resets = EmailVerify.objects.filter(creation_time__lt=now - timedelta(hours=3))

    # Delete the expired resets
    for reset in expired_resets:
        reset.delete()
    
    return True

@shared_task(name='low_priority:clear_reset_password')
def clear_reset_password():
    # Get the current time
    now = datetime.now()

    # Filter PasswordReset objects where creation_time is more than 3 hours ago
    expired_resets = PasswordReset.objects.filter(creation_time__lt=now - timedelta(hours=3))

    # Delete the expired resets
    for reset in expired_resets:
        reset.delete()
    
    return True

@shared_task(name='low_priority:clear_expired_tokens')
def clear_expired_tokens():

    ates = OAUTH2_PROVIDER['ACCESS_TOKEN_EXPIRE_SECONDS']
    rtes = OAUTH2_PROVIDER['REFRESH_TOKEN_EXPIRE_SECONDS']

    # Get the current time
    now = datetime.now()

    expired_access = AccessToken.objects.filter(expires__lt=now)
    expired_refresh = RefreshToken.objects.filter(created__lt=now - timedelta(seconds=rtes))

    for reset in expired_access:
        reset.delete()

    for reset in expired_refresh:
        reset.delete()

    return True


# For checking task status
@task_postrun.connect
def task_postrun_handler(task_id, **kwargs):
    """
    When celery task finish, send notification to Django channel_layer, so Django channel would receive
    the event and then send it to web client
    """
    notify_channel_layer(task_id)