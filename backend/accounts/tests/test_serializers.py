import pytest
from accounts.serializers import AuthSerializer , CustomUserSerializer, NavbarUserInfoSerializer, NewSerializer, SimpleUserSerializer
from conftest import UserFactory, FullUserFactory
from accounts.models import CustomUser
import datetime

@pytest.mark.django_db
class TestAuthSerializer:
    def test_valid_data(self):
        pass 
    def test_invalid_data(self):
        pass

    def test_serialize_model(self):
        pass

@pytest.mark.django_db

# fields = ('id', 'username', 'email', 'first_name', 'surname', 'date_of_birth', 'biological_gender', 'password')
class TestCustomUserSerializer:
    def test_valid_data(self):
        users = CustomUser.objects.all()
        assert len(users) == 0
        valid_data = {
            'username': "max_198", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
            'date_of_birth': "2002-07-11",
            'biological_gender': "male", 
            'password': "123Password.com", 
            'email_verify': 'true',
        }

        serializer = CustomUserSerializer(data=valid_data)

        assert serializer.is_valid()

        serializer.create(serializer.validated_data)
        users = CustomUser.objects.all()
        assert len(users) == 1

    def test_invalid_data(self):
        
        # Empty data
        invalid_data_1 = {
        }

        serializer = CustomUserSerializer(data=invalid_data_1)
        assert not serializer.is_valid()
        
        # Missing username
        invalid_data_2 = {
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
            'date_of_birth': "2002-07-11",
            'biological_gender': "male", 
            'password': "123Password.com", 
        }

        serializer = CustomUserSerializer(data=invalid_data_2)
        assert not serializer.is_valid()

        # Missing email
        invalid_data_3 = {
            'username': "max_198", 
            'first_name': "Max",
            'surname': "Smith",
            'date_of_birth': "2002-07-11",
            'biological_gender': "male", 
            'password': "123Password.com",
        }

        serializer = CustomUserSerializer(data=invalid_data_3)
        assert not serializer.is_valid()

        # Missing first_name
        invalid_data_4 = {
            'username': "max_198",
            'email':"maxsmithbusiness198@gmail.com",
            'surname': "Smith",
            'date_of_birth': "2002-07-11",
            'biological_gender': "male", 
            'password': "123Password.com",
        }

        serializer = CustomUserSerializer(data=invalid_data_4)
        assert not serializer.is_valid()

        # Missing surname
        invalid_data_5 = {
            'username': "max_198",
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'date_of_birth': "2002-07-11",
            'biological_gender': "male", 
            'password': "123Password.com", 
        }

        serializer = CustomUserSerializer(data=invalid_data_5)
        assert not serializer.is_valid()

        # Missing date_of_birth
        invalid_data_6 = {
            'username': "max_198",
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
            'biological_gender': "male", 
            'password': "123Password.com",
        }

        serializer = CustomUserSerializer(data=invalid_data_6)
        assert not serializer.is_valid()

        # Missing biological_gender
        invalid_data_7 = {
            'username': "max_198",
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
            'date_of_birth': "2002-07-11",
            'password': "123Password.com",
        }

        # If no gender is provided then default the user to be male, hence this should be valid
        serializer = CustomUserSerializer(data=invalid_data_7)
        assert serializer.is_valid()

        # Missing password
        invalid_data_8 = {
            'username': "max_198",
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
            'date_of_birth': "2002-07-11",
            'biological_gender': "male", 
        }

        serializer = CustomUserSerializer(data=invalid_data_8)
        assert not serializer.is_valid()


    def test_serialize_model(self, full_user):

        users = CustomUser.objects.all()
        assert len(users) == 1

        user = CustomUser.objects.all().first()

        serializer = CustomUserSerializer(instance=user)

        assert serializer.data == {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "surname": user.surname,
            "date_of_birth":  str(user.date_of_birth),
            "biological_gender": user.biological_gender,
        }

        serializer.update(instance=user, validated_data={"username": "hello_world"})
        assert user.username == "hello_world"

        serializer.update(instance=user, validated_data={"first_name": "hello"})
        assert user.first_name == "hello"

        serializer.update(instance=user, validated_data={"surname": "world"})
        assert user.surname == "world"

@pytest.mark.django_db
class TestNavbarUserInfoSerializer:
    
    def test_valid_data(self):
        valid_data = {
            'username': "max_198", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
            'email_verify': 'true',
        }
        serializer = NavbarUserInfoSerializer(data=valid_data)
        
        assert serializer.is_valid()

        valid_data['email_verify'] = True

        assert serializer.validated_data == valid_data

    
    def test_invalid_data(self):
        # Empty data
        invalid_data_1 = {
        }

        serializer = NavbarUserInfoSerializer(data=invalid_data_1)
        assert not serializer.is_valid()

        # Invalid username
        invalid_data_2 = {
            'username': "max198__,,,", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
            'email_verify': 'true',
        }

        
        serializer = NavbarUserInfoSerializer(data=invalid_data_2)
        assert not serializer.is_valid()

        # Missing username
        invalid_data_3 = {
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
            'email_verify': 'true',
        }
        serializer = NavbarUserInfoSerializer(data=invalid_data_3)
        assert not serializer.is_valid()

        # Invalid email
        invalid_data_4 = {
            'username': "max198", 
            'email':"maxsmithbusiness198", 
            'first_name': "Max",
            'surname': "Smith",
            'email_verify': 'true',
        }

        serializer = NavbarUserInfoSerializer(data=invalid_data_4)
        assert not serializer.is_valid()

        # Missing email
        invalid_data_5 = {
            'username': "max198", 
            'first_name': "Max",
            'surname': "Smith",
            'email_verify': 'true',
        }

        serializer = NavbarUserInfoSerializer(data=invalid_data_5)
        assert not serializer.is_valid()

        # Invalid first_name
        invalid_data_6 = {
            'username': "max198", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max123",
            'surname': "Smith",
            'email_verify': 'true',
        }

        serializer = NavbarUserInfoSerializer(data=invalid_data_6)
        assert not serializer.is_valid()

        # Invalid surname
        invalid_data_7 = {
            'username': "max198", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith123",
            'email_verify': 'true',
        }

        serializer = NavbarUserInfoSerializer(data=invalid_data_7)
        assert not serializer.is_valid()

        # Missing email_verify
        invalid_data_8 = {
            'username': "max198", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith123",
        }

        serializer = NavbarUserInfoSerializer(data=invalid_data_8)
        assert not serializer.is_valid()

    def test_serialize_model(self, user):
        users = CustomUser.objects.all()
        assert len(users) == 1
        user_test = users.first()
        serializer = NavbarUserInfoSerializer(instance=user_test)
        assert serializer.data == {
                                    'username': user_test.username, 
                                    'email':user_test.email, 
                                    'first_name': user_test.first_name,
                                    'surname': user_test.surname,
                                    'email_verify': False
                                }


@pytest.mark.django_db
class TestNewSerializer:

    # Tests serializing JSON data
    def test_valid_data(self):
        valid_data= {
            'username': "max198", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
        }

        serializer = NewSerializer(data=valid_data)
        assert serializer.is_valid()
        assert serializer.validated_data == valid_data

    # Tests serializing invalid data and receiving False from .is_valid()
    def test_invalid_data(self):
        
        # Empty data
        invalid_data_1 = {
        }

        serializer = NewSerializer(data=invalid_data_1)
        assert not serializer.is_valid()

        # Invalid username
        invalid_data_2 = {
            'username': "max198__,,,", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
        }

        
        serializer = NewSerializer(data=invalid_data_2)
        assert not serializer.is_valid()

        # Missing username
        invalid_data_3 = {
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith",
        }
        serializer = NewSerializer(data=invalid_data_3)
        assert not serializer.is_valid()

        # Invalid email
        invalid_data_4 = {
            'username': "max198", 
            'email':"maxsmithbusiness198", 
            'first_name': "Max",
            'surname': "Smith",
        }

        serializer = NewSerializer(data=invalid_data_4)
        assert not serializer.is_valid()

        # Missing email
        invalid_data_5 = {
            'username': "max198", 
            'first_name': "Max",
            'surname': "Smith",
        }

        serializer = NewSerializer(data=invalid_data_5)
        assert not serializer.is_valid()

        # Invalid first_name
        invalid_data_6 = {
            'username': "max198", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max123",
            'surname': "Smith",
        }

        serializer = NewSerializer(data=invalid_data_6)
        assert not serializer.is_valid()

        # Invalid surname
        invalid_data_7 = {
            'username': "max198", 
            'email':"maxsmithbusiness198@gmail.com", 
            'first_name': "Max",
            'surname': "Smith123",
        }

        serializer = NewSerializer(data=invalid_data_7)
        assert not serializer.is_valid()

    # Tests serializing a model and checks whether the data has been serialized properly
    def test_serialize_model(self, user):
        users = CustomUser.objects.all()
        assert len(users) == 1
        user_test = users.first()
        serializer = NewSerializer(instance=user_test)
        assert serializer.data == {
                                    'username': user_test.username, 
                                    'email':user_test.email, 
                                    'first_name': user_test.first_name,
                                    'surname': user_test.surname,
                                }

@pytest.mark.django_db
class TestSimpleUserSerializer:
    def test_valid_data(self):
        valid_data= {
            'id': 1,
            'username': "max198",
        }

        serializer = SimpleUserSerializer(data=valid_data)
        assert serializer.is_valid()

        valid_data.pop('id')
        assert serializer.data == valid_data

    def test_invalid_data(self):

        # Tests invalid username
        invalid_data_1= {
            'id': 1,
            'username': "max198,,",
        }

        serializer = SimpleUserSerializer(data=invalid_data_1)
        assert not serializer.is_valid()

        # Tests empty data
        invalid_data_2 = {
        }

        serializer = SimpleUserSerializer(data=invalid_data_2)
        assert not serializer.is_valid()

    def test_serialize_model(self, user):
        users = CustomUser.objects.all()
        assert len(users) == 1
        user_test = users.first()
        serializer = SimpleUserSerializer(instance=user_test)
        assert serializer.data == {
                                    'id': user_test.id,
                                    'username': user_test.username, 
                                }



