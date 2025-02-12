from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _
import re

class CustomUserManager(BaseUserManager):
    """
    Custom user manager for creating and managing users.
    """
    def create_user(self, username, email, password=None, first_name=None, surname=None, date_of_birth=None, **extra_fields):
        """
        Creates and saves a new user with the given email, username, and password.
        """
        if not email:
            raise ValueError('Users must have an email address')
        if not username:
            raise ValueError('Users must have a username')


        # Normalize the email and username
        #email = self.normalize_email(email)
        username = username.lower()

        # Validate username
        if not re.match(r"^[a-zA-Z0-9_]{4,30}$", username):
            raise ValueError("Username must be between 4 and 30 characters long and contain only letters, numbers, and underscores.")

        user = self.model(
            email=email,
            username=username,
            first_name=first_name,
            surname=surname,
            date_of_birth=date_of_birth,
            **extra_fields
        )

        
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None):
        """
        Creates and saves a new superuser with the given username, and password.
        """
        user = self.create_user(
            username=username,
            email=email,
            password=password,
        )
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user