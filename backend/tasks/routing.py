from django.urls import path, include
from .consumers import TaskStatusConsumer

urlpatterns = [
    path('status/<task_id>', TaskStatusConsumer.as_asgi()),
]