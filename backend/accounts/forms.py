from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django import forms
from .models import CustomUser


class CustomUserCreationForm(UserCreationForm):

    class Meta:
        model = CustomUser
        fields = ("email", "first_name", "surname", "date_of_birth")

class CustomUserChangeForm(UserChangeForm):

    class Meta:
        model = CustomUser
        fields = ("email", 
                  "first_name", 
                  "surname", 
                  "date_of_birth", 
                  "password", 
                  "is_staff", 
                  "is_active", 
                  "groups", 
                  "user_permissions") 
        

class EditUser(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = ("email", "first_name", "surname", "date_of_birth")

        widgets = {
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'surname': forms.TextInput(attrs={'class': 'form-control'}),
            'date_of_birth': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),  # Use HTML5 date picker
        }
    
    def __init__(self, *args, **kwargs):
        super(EditUser, self).__init__(*args, **kwargs)
        self.fields['password'].widget = forms.HiddenInput()
