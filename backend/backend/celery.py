"""
https://docs.celeryq.dev/en/stable/django/first-steps-with-django.html
"""
import os

from celery import Celery
from django.conf import settings
import logging
from celery.signals import after_setup_logger

# this code copied from manage.py
# set the default Django settings module for the 'celery' app.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# you can change the name here
app = Celery("backend")

# read config from Django settings, the CELERY namespace would make celery
# config keys has `CELERY` prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# discover and load tasks.py from from all registered Django apps
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@after_setup_logger.connect()
def on_after_setup_logger(logger, **kwargs):
    formatter = logger.handlers[0].formatter
    file_handler = logging.FileHandler('celery.log')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

