from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, Group, Permission
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager

class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Fields:
    """
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(_("email address"), unique=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    first_name = models.CharField(max_length=100, blank=True, null=True)  
    surname = models.CharField(max_length=100, blank=True, null=True) 
    date_of_birth = models.DateField(blank=True, null=True) 
    followers = models.ManyToManyField('self', symmetrical=False, related_name='followed_by')
    following = models.ManyToManyField('self', symmetrical=False, related_name='following_user') 
    biological_gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female')], default='male')
    elos = models.ManyToManyField('elo.Elo', related_name="elo_s")

    groups = models.ManyToManyField(
        Group,
        verbose_name=_('groups'),
        blank=True,
        related_name='custom_user_set', 
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name=_('user permissions'),
        blank=True,
        related_name='custom_user_set', 
    )
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email
    
    # Add a property to calculate follower count
    @property
    def follower_count(self):
        return self.followers.count()

    # Add a property to calculate following count
    @property
    def following_count(self):
        return self.following.count()
    
from elo.models import Elo