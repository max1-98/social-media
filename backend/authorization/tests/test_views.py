import pytest
from unittest.mock import patch
from django.utils import timezone
from rest_framework.test import APIClient
from authorization.models import PasswordReset, EmailVerify
from accounts.tests.conftest import UserFactory


@pytest.fixture
def password_reset_user(db):
    user = UserFactory()
    token = "valid-reset-token-12345678901234"
    PasswordReset.objects.create(
        user=user,
        token=token,
        creation_time=timezone.now(),
    )
    return user, token


@pytest.fixture
def email_verify_user(db):
    user = UserFactory()
    token = "valid-verify-token-1234567890123"
    EmailVerify.objects.create(
        user=user,
        token=token,
        creation_time=timezone.now(),
    )
    return user, token


class TestPasswordResetView:
    def test_invalid_token_returns_400(self, db):
        client = APIClient()
        response = client.post(
            "/authorization/reset/",
            {"password1": "NewPass123!", "password2": "NewPass123!", "password_token": "nonexistent-token"},
        )
        assert response.status_code == 400
        assert "expired" in response.data["detail"].lower()

    def test_valid_token_resets_password(self, password_reset_user):
        user, token = password_reset_user
        client = APIClient()
        response = client.post(
            "/authorization/reset/",
            {"password1": "NewSecurePass123!", "password2": "NewSecurePass123!", "password_token": token},
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.check_password("NewSecurePass123!")


class TestEmailVerifyView:
    def test_invalid_token_returns_400(self, db):
        client = APIClient()
        response = client.post(
            "/authorization/verify/",
            {"email_token": "nonexistent-token"},
        )
        assert response.status_code == 400
        assert "expired" in response.data["detail"].lower()

    @patch("authorization.views.send_verify_complete_email.delay")
    def test_valid_token_verifies_email(self, mock_task, email_verify_user):
        user, token = email_verify_user
        client = APIClient()
        response = client.post(
            "/authorization/verify/",
            {"email_token": token},
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.email_verify is True
        mock_task.assert_called_once()
