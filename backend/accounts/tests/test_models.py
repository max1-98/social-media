
import pytest
from accounts.models import CustomUser
from django.core.exceptions import ValidationError
import random
import string
import json

def generate_random_string(length=100):
  """Generates a random string of specified length."""
  return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(length))

@pytest.mark.django_db
def test_create_user():
    user = CustomUser(username="max1_98", email="maxsmithbusiness198@gmail.com", first_name="Max", surname="Smith", password="123Password.com")
    user.save()
    user.full_clean()
    assert user.username == "max1_98"
    assert user.email == "maxsmithbusiness198@gmail.com"
    assert user.first_name == "Max"
    assert user.surname == "Smith"

@pytest.mark.django_db
def test_create_user_invalid_fields():
    
    # invalid username
    with pytest.raises(ValidationError):
        user = CustomUser(username="invalid-username!", email="maxsmithbusiness198@gmail.com", first_name="Max", surname="Smith")
        user.full_clean()
        user.save()

    # invalid email
    with pytest.raises(ValidationError):
        user = CustomUser(username="max1_98", email="£12ergoenfewo@gmail.com", first_name="Max", surname="Smith")
        user.full_clean()
        user.save()

    # invalid first_name
    with pytest.raises(ValidationError):
        user = CustomUser(username="max1_98", email="maxsmithbusiness198@gmail.com", first_name=generate_random_string(23), surname="Smith")
        user.full_clean()
        user.save()

    # invalid surname
    with pytest.raises(ValidationError):
        user = CustomUser(username="max1_98", email="maxsmithbusiness198@gmail.com", first_name="Max", surname=generate_random_string(22))
        user.full_clean()
        user.save()

"""
with open('users.json', 'r') as file:
    data = json.load(file)

"""