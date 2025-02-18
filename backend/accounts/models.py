from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, Group, Permission
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager
from django.core.validators import RegexValidator

class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Fields:
    """
    username = models.CharField(max_length=20,
                                unique=True,
                                validators=[
                                    RegexValidator(r'^[a-zA-Z0-9._-]*$', 'Username can only contain letters, numbers and _ - . .')
                                ]
                                )

    # Email fields
    email = models.EmailField(_("email address"), unique=True)
    email_verify = models.BooleanField(default=False)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    first_name = models.CharField(  max_length=20,
                                    validators=[
                                        RegexValidator(r'^[a-zA-Z]*$', 'First name can only contain letters.')
                                    ]
                                    )  
    surname = models.CharField( max_length=20,
                                validators=[
                                    RegexValidator(r'^[a-zA-Z]*$', 'First name can only contain letters.')
                                ]
                                ) 
    date_of_birth = models.DateField() 
    biological_gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female')], default='male')
    elos = models.ManyToManyField('elo.Elo', related_name="elo_s")
    memberships = models.ManyToManyField('clubs.Member', related_name="memberships")

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


