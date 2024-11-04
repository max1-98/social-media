from django.db import models
from accounts.models import CustomUser
from clubs.models import ClubModel

class Post(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    club = models.ForeignKey(ClubModel, on_delete=models.CASCADE, null=True, blank=True)  

    def __str__(self):
        return f"{self.content[:50]}..."