from rest_framework import serializers
from .models import CustomUser
from django.contrib.auth import authenticate


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'surname', 'date_of_birth', 'biological_gender', 'password') 
        extra_kwargs = {
            'password': {'write_only': True},  # Password should not be returned in the response
            'id': {'read_only': True},  # ID should not be modifiable from the frontend
        }

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

    def update(self, instance, validated_data):
        # Don't allow updating the password through this serializer
        if 'password' in validated_data:
            del validated_data['password']
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.surname = validated_data.get('surname', instance.surname)
        instance.date_of_birth = validated_data.get('date_of_birth', instance.date_of_birth)
        instance.biological_gender = validated_data.get('biological_gender', instance.biological_gender)
        instance.save()
        return instance

class NavbarUserInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'surname', 'email_verify') 
       
class NewSerializer(serializers.ModelSerializer):

    class Meta:
        model=CustomUser
        fields= ('username', 'email', 'first_name', 'surname')
   

class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username')

class AuthSerializer(serializers.Serializer):
    '''serializer for the user authentication object'''
    username = serializers.CharField()
    password = serializers.CharField(
        style={'input_type': 'password'},
        trim_whitespace=False
    )    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        user = authenticate(
            request=self.context.get('request'),
            username=username,
            password=password
        )
        
        if not user:
            msg = ('Unable to authenticate with provided credentials')
            raise serializers.ValidationError(msg, code='authentication')

        attrs['user'] = user
        return 