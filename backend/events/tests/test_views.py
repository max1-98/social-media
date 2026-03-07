import pytest
from rest_framework.test import APIClient
from accounts.tests.conftest import UserFactory


@pytest.fixture
def authenticated_client(db):
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestActiveEventsView:
    url = '/club/events/active/'

    def test_returns_501_not_implemented(self, authenticated_client):
        """ActiveEventsView should return 501, not crash with ZeroDivisionError."""
        response = authenticated_client.get(self.url)
        assert response.status_code == 501


@pytest.mark.django_db
class TestCreateSportsRemoved:

    def test_test_endpoint_removed(self, authenticated_client):
        """The /test/ endpoint (CreateSports) should no longer exist."""
        response = authenticated_client.get('/test/')
        assert response.status_code == 404
