import pytest
from accounts.serializers import NavbarUserInfoSerializer, NewSerializer
    

fields = ('id', 'username', 'email', 'first_name', 'surname', 'email_verify') 


@pytest.mark.django_db
def test_user_serializer():
    valid_data = {
        'id': '1',
        'username': "max_198", 
        'email':"maxsmithbusiness198@gmail.com", 
        'first_name': "Max",
        'surname': "Smith",
        'email_verify': 'true',
    }
    serializer = NavbarUserInfoSerializer(data=valid_data)
    print(serializer)
    
    assert serializer.is_valid()
    assert serializer.validated_data == valid_data

@pytest.mark.django_db
def test_user_serializer():
    valid_data= {
        'username': "max198", 
        'email':"maxsmithbusiness198@gmail.com", 
        'first_name': "Max",
        'surname': "Smith",
    }

    serializer = NewSerializer(data=valid_data)
    assert serializer.is_valid()
    assert serializer.validated_data == valid_data