import pytest
from django.conf import settings
from oauth2_provider.models import get_application_model, AccessToken, RefreshToken
from oauthlib.common import generate_token
from django.utils import timezone
from datetime import timedelta
from accounts.tests.conftest import UserFactory

Application = get_application_model()


@pytest.fixture
def oauth_app(db):
    """Create an OAuth2 application for testing."""
    user = UserFactory()
    app = Application.objects.create(
        user=user,
        client_type=Application.CLIENT_CONFIDENTIAL,
        authorization_grant_type=Application.GRANT_PASSWORD,
        client_id='test-client-id',
        client_secret='test-client-secret',
        name='test-app',
    )
    return app


@pytest.fixture
def user_with_password(db):
    """Create a user with a known password."""
    user = UserFactory.build()
    raw_password = 'testpass123!'
    user.set_password(raw_password)
    user.save()
    return user, raw_password


@pytest.fixture
def user_tokens(db, oauth_app, user_with_password):
    """Create a user with valid OAuth tokens."""
    user, _ = user_with_password
    access_token = AccessToken.objects.create(
        user=user,
        application=oauth_app,
        token=generate_token(),
        expires=timezone.now() + timedelta(seconds=3600),
        scope='read write',
    )
    refresh_token = RefreshToken.objects.create(
        user=user,
        application=oauth_app,
        token=generate_token(),
        access_token=access_token,
    )
    return user, access_token, refresh_token
