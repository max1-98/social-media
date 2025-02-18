import pytest
from oauth2_provider.models import get_application_model, AbstractApplication

# retrieves the application model for auth
Application = get_application_model()


from accounts.models import CustomUser


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

@pytest.mark.django_db
def test_all_views_with_auth(client):

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

    apps = Application.objects.all()
    assert len(apps) == 0

    user = CustomUser.objects.first()
    app = Application(
        user=user,
        client_type=AbstractApplication.CLIENT_CONFIDENTIAL,
        hash_client_secret=False,
        authorization_grant_type=AbstractApplication.GRANT_PASSWORD,
    )
    app.save()
    
    apps = Application.objects.all()
    assert len(apps) == 1

    CLIENT_ID = app.client_id
    CLIENT_SECRET = app.client_secret

    resp = client.post(
        "/auth/token/",
        {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": 'password',
            "username": "max198",
            "password": "123ThisPasswordRocks!"
        },
    )
    
    assert resp.status_code == 200

    token = resp.data["access_token"]
    refresh_token =  resp.data["refresh_token"]
    assert token
    assert refresh_token

    resp = client.get(
        "/account/profile/",
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "accept": "application/json",
        }
    )

    assert resp.status_code == 200
    assert resp.data['id'] == 1
    assert resp.data['username'] == "max198"
    assert resp.data['email'] == "maxsmithbusiness198@gmail.com"
    assert resp.data['first_name'] == "Max"
    assert resp.data['surname'] == "Smith"
    assert resp.data['date_of_birth'] == "2002-07-11"
    assert resp.data['biological_gender'] == "male"

    resp = client.get( 
        "/account/navbar_info/",
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "accept": "application/json",
        }
    )

    assert resp.status_code == 200
    assert resp.data['username'] == "max198"
    assert resp.data['email'] == "maxsmithbusiness198@gmail.com"
    assert resp.data['first_name'] == "Max"
    assert resp.data['surname'] == "Smith"
    assert resp.data['email_verify'] == False

    
