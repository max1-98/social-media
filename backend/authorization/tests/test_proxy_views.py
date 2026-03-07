import pytest
from django.test import override_settings
from rest_framework.test import APIClient
from oauth2_provider.models import AccessToken, RefreshToken


@pytest.fixture
def api_client():
    return APIClient()


PROXY_SETTINGS = {
    'OAUTH_CLIENT_ID': 'test-client-id',
    'OAUTH_CLIENT_SECRET': 'test-client-secret',
}


@pytest.mark.django_db
class TestAuthProxyLogin:
    url = '/authorization/proxy-login/'

    @override_settings(**PROXY_SETTINGS)
    def test_login_success(self, api_client, oauth_app, user_with_password):
        user, password = user_with_password
        response = api_client.post(self.url, {
            'username': user.username,
            'password': password,
        })
        assert response.status_code == 200
        assert response.data['user']['id'] == user.id
        assert response.data['user']['username'] == user.username
        assert 'access_token' in response.cookies
        assert 'refresh_token' in response.cookies
        assert response.cookies['access_token']['httponly']
        assert response.cookies['refresh_token']['httponly']

    @override_settings(**PROXY_SETTINGS)
    def test_login_creates_oauth_tokens(self, api_client, oauth_app, user_with_password):
        user, password = user_with_password
        api_client.post(self.url, {
            'username': user.username,
            'password': password,
        })
        assert AccessToken.objects.filter(user=user).exists()
        assert RefreshToken.objects.filter(user=user).exists()

    @override_settings(**PROXY_SETTINGS)
    def test_login_wrong_password(self, api_client, oauth_app, user_with_password):
        user, _ = user_with_password
        response = api_client.post(self.url, {
            'username': user.username,
            'password': 'wrong-password',
        })
        assert response.status_code == 401
        assert 'access_token' not in response.cookies

    @override_settings(**PROXY_SETTINGS)
    def test_login_missing_fields(self, api_client, oauth_app):
        response = api_client.post(self.url, {})
        assert response.status_code == 400

    @override_settings(**PROXY_SETTINGS)
    def test_login_nonexistent_user(self, api_client, oauth_app):
        response = api_client.post(self.url, {
            'username': 'nonexistent',
            'password': 'password123',
        })
        assert response.status_code == 401

    @override_settings(**PROXY_SETTINGS)
    def test_login_cookie_settings(self, api_client, oauth_app, user_with_password):
        """Verify cookies have correct security attributes."""
        user, password = user_with_password
        response = api_client.post(self.url, {
            'username': user.username,
            'password': password,
        })
        access_cookie = response.cookies['access_token']
        assert access_cookie['httponly']
        assert access_cookie['samesite'] == 'Lax'
        assert access_cookie['path'] == '/'


@pytest.mark.django_db
class TestAuthProxyLogout:
    url = '/authorization/proxy-logout/'

    @override_settings(**PROXY_SETTINGS)
    def test_logout_success(self, api_client, oauth_app, user_tokens):
        user, access_token, refresh_token = user_tokens
        api_client.cookies['access_token'] = access_token.token
        api_client.cookies['refresh_token'] = refresh_token.token
        response = api_client.post(self.url)
        assert response.status_code == 200
        # Cookies should be cleared (max-age=0)
        assert response.cookies['access_token']['max-age'] == 0
        assert response.cookies['refresh_token']['max-age'] == 0

    @override_settings(**PROXY_SETTINGS)
    def test_logout_revokes_token(self, api_client, oauth_app, user_tokens):
        user, access_token, refresh_token = user_tokens
        api_client.cookies['access_token'] = access_token.token
        api_client.cookies['refresh_token'] = refresh_token.token
        api_client.post(self.url)
        # Access token should be deleted or revoked
        assert not AccessToken.objects.filter(token=access_token.token).exists()

    @override_settings(**PROXY_SETTINGS)
    def test_logout_no_cookie(self, api_client, oauth_app):
        response = api_client.post(self.url)
        assert response.status_code == 200  # Logout is idempotent


@pytest.mark.django_db
class TestAuthProxyRefresh:
    url = '/authorization/proxy-refresh/'

    @override_settings(**PROXY_SETTINGS)
    def test_refresh_success(self, api_client, oauth_app, user_tokens):
        user, access_token, refresh_token = user_tokens
        api_client.cookies['refresh_token'] = refresh_token.token
        response = api_client.post(self.url)
        assert response.status_code == 200
        assert 'access_token' in response.cookies
        assert response.cookies['access_token']['httponly']
        # New access token should be different
        new_token = response.cookies['access_token'].value
        assert new_token != access_token.token

    @override_settings(**PROXY_SETTINGS)
    def test_refresh_no_cookie(self, api_client, oauth_app):
        response = api_client.post(self.url)
        assert response.status_code == 401

    @override_settings(**PROXY_SETTINGS)
    def test_refresh_invalid_token(self, api_client, oauth_app):
        api_client.cookies['refresh_token'] = 'invalid-token'
        response = api_client.post(self.url)
        assert response.status_code == 401
