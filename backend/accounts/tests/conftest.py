import pytest
from factory import LazyAttribute
from factory.django import DjangoModelFactory
from factory import Faker
from factory.fuzzy import FuzzyText,FuzzyDate, FuzzyChoice

import datetime 
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from accounts.models import CustomUser
import random


class UserFactory(DjangoModelFactory):
    class Meta:
        model = CustomUser

    username = FuzzyText(length=random.randint(5, 20), chars=r'^[a-zA-Z0-9._-]*$', prefix='')
    email = LazyAttribute(lambda o: '%s@example.com' % o.username)
    password = LazyAttribute(lambda o: make_password(o.username))
    first_name = Faker("first_name")
    surname = Faker("last_name")

class FullUserFactory(DjangoModelFactory):
    class Meta:
        model = CustomUser

    username = FuzzyText(length=random.randint(5, 20), chars=r'^[a-zA-Z0-9._-]*$', prefix='')
    email = LazyAttribute(lambda o: '%s@example.com' % o.username)
    password = LazyAttribute(lambda o: make_password(o.username))
    first_name = Faker("first_name")
    surname = Faker("last_name")
    date_of_birth = FuzzyDate(start_date=datetime.date(1900, 1, 1))
    biological_gender = FuzzyChoice(['male', 'female'])
    email_verify = FuzzyChoice([True, False])
    

# Fixture that returns 10 users
@pytest.fixture(scope="function")
def users():
    UserFactory.create_batch(10)

@pytest.fixture(scope="function")
def user():
    UserFactory()

@pytest.fixture(scope="function")
def full_user():
    FullUserFactory()