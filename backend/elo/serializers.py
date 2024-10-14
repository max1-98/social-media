from rest_framework import serializers
from .models import Elo

class EloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Elo
        fields = '__all__'  # Include all fields from the Elo model