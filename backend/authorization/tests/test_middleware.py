import pytest
from django.test import RequestFactory
from authorization.middleware import CookieTokenAuthMiddleware


@pytest.fixture
def middleware():
    def dummy_response(request):
        return request
    return CookieTokenAuthMiddleware(dummy_response)


@pytest.fixture
def rf():
    return RequestFactory()


class TestCookieTokenAuthMiddleware:
    def test_sets_auth_header_from_cookie(self, middleware, rf):
        request = rf.get('/')
        request.COOKIES['access_token'] = 'test-token-123'
        result = middleware(request)
        assert result.META['HTTP_AUTHORIZATION'] == 'Bearer test-token-123'

    def test_no_cookie_no_header(self, middleware, rf):
        request = rf.get('/')
        result = middleware(request)
        assert 'HTTP_AUTHORIZATION' not in result.META

    def test_does_not_override_existing_header(self, middleware, rf):
        request = rf.get('/', HTTP_AUTHORIZATION='Bearer existing-token')
        request.COOKIES['access_token'] = 'cookie-token'
        result = middleware(request)
        assert result.META['HTTP_AUTHORIZATION'] == 'Bearer existing-token'

    def test_works_with_post_request(self, middleware, rf):
        request = rf.post('/')
        request.COOKIES['access_token'] = 'post-token'
        result = middleware(request)
        assert result.META['HTTP_AUTHORIZATION'] == 'Bearer post-token'
