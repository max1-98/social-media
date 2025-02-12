import json

import pytest

from accounts.models import CustomUser


@pytest.mark.django_db
def test_create_user(client):
    users = CustomUser.objects.all()
    assert len(users) == 0

    resp = client.post(
        "/account/register/",
        {
            "username": "max198",
            "email": "maxsmithbusiness198@gmail.com",
            "first_name": "Max",
            "surname": "Smith",
            "date_of_birth": "2002-07-11",
            "biological_gender": "male",
            "password": "123ThisPasswordRocks!"
        },
    )
    assert resp.status_code == 201

    users = CustomUser.objects.all()
    assert len(users) == 1

@pytest.mark.django_db
def test_create_user_invalid_json(client):
    users = CustomUser.objects.all()
    assert len(users) == 0

    resp = client.post(
        "/account/register/",
        {},
    )
    assert resp.status_code == 400

    users = CustomUser.objects.all()
    assert len(users) == 0


@pytest.mark.django_db
def test_create_user_insufficient_data(client):
    users = CustomUser.objects.all()
    assert len(users) == 0

    resp = client.post(
        "/account/register/",
        {
            "username": "max198",
            "email": "maxsmithbusiness198@gmail.com",
            "first_name": "Max",
            "surname": "Smith",
        },
    )
    assert resp.status_code == 400

    users = CustomUser.objects.all()
    assert len(users) == 0