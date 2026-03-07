import pytest
from rest_framework.test import APIClient

from accounts.tests.conftest import UserFactory
from factories import (  # noqa: F401 — re-exported for conftest availability
    SportFactory, GameTypeFactory, ClubFactory, MemberFactory,
    MemberRequestFactory, EventFactory, GameFactory, EloFactory,
)


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def authenticated_client(db):
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    client.user = user
    return client
