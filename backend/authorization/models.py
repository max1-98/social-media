from django.db import models
from django.contrib.auth import get_user_model

class PasswordReset(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    token = models.CharField(max_length=32, unique=True)
    creation_time = models.DateTimeField()

class EmailVerify(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    token = models.CharField(max_length=32, unique=True)
    creation_time = models.DateTimeField()

