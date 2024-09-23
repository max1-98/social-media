from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .forms import CustomUserCreationForm, CustomUserChangeForm
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    ordering= ("email",)
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser

    list_display = ("email", "first_name","surname", "is_staff", "is_active")
    list_filter = ("email", "first_name","surname", "is_staff", "is_active")

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email", "password1", "password2", "first_name", "surname", "date_of_birth", "is_staff",
                "is_active", "groups", "user_permissions"
            )}
        ),
    )
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "surname", "date_of_birth")}),
        ("Permissions", {"fields": ("is_staff", "is_active", "groups", "user_permissions")}),
    )

admin.site.register(CustomUser, CustomUserAdmin)
