import pytest
from factory import LazyAttribute
from factory.django import DjangoModelFactory
from factory import Faker

from django.contrib.auth.hashers import make_password
from accounts.models import CustomUser


class UserFactory(DjangoModelFactory):
    class Meta:
        model = CustomUser

    username = Faker("user_name", regex=r'^[a-zA-Z0-9._-]*$')
    email = LazyAttribute(lambda o: '%s@example.com' % o.username)
    password = LazyAttribute(lambda o: make_password(o.username))
    first_name = Faker("first_name")
    last_name = Faker("last_name")


# Fixture that returns 10 users
@pytest.fixture(scope="function")
def user():
    return UserFactory.create_batch(10)