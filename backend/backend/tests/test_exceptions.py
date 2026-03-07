"""Tests for the custom DRF exception handler."""
import pytest
from unittest.mock import MagicMock
from rest_framework.exceptions import (
    NotFound, PermissionDenied, ValidationError, AuthenticationFailed,
)
from rest_framework.test import APIRequestFactory

from backend.exceptions import custom_exception_handler


@pytest.fixture
def view_context():
    factory = APIRequestFactory()
    request = factory.get("/")
    return {"request": request, "view": MagicMock()}


class TestCustomExceptionHandler:
    def test_wraps_not_found(self, view_context):
        exc = NotFound("Not found.")
        response = custom_exception_handler(exc, view_context)
        assert response.status_code == 404
        assert response.data["code"] == 404
        assert "error" in response.data

    def test_wraps_permission_denied(self, view_context):
        exc = PermissionDenied("Forbidden.")
        response = custom_exception_handler(exc, view_context)
        assert response.status_code == 403
        assert response.data["code"] == 403

    def test_wraps_validation_error(self, view_context):
        exc = ValidationError({"name": ["This field is required."]})
        response = custom_exception_handler(exc, view_context)
        assert response.status_code == 400
        assert response.data["code"] == 400
        assert "error" in response.data

    def test_wraps_authentication_failed(self, view_context):
        exc = AuthenticationFailed("Invalid token.")
        response = custom_exception_handler(exc, view_context)
        assert response.status_code == 401
        assert response.data["code"] == 401

    def test_returns_none_for_unhandled_exception(self, view_context):
        exc = RuntimeError("unexpected")
        response = custom_exception_handler(exc, view_context)
        assert response is None

    def test_response_has_consistent_keys(self, view_context):
        exc = NotFound()
        response = custom_exception_handler(exc, view_context)
        assert set(response.data.keys()) == {"error", "code"}
