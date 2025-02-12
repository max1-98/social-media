from django.urls import path, include
from tasks.consumers import TaskStatusConsumer

urlpatterns = [
    path('ws/tasks/status/<task_id>', TaskStatusConsumer.as_asgi()),
]