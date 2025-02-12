from django.db import models

class ClubManager(models.Manager):
    def create(self, *args, **kwargs):
        return super().create(*args, **kwargs)