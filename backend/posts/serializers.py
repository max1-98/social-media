from rest_framework import serializers
from clubs.models import ClubModel
from .models import Post

class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['id', 'content', 'created_at', 'author', 'club'] 