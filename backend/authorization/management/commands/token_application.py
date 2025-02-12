from django.conf import settings
from django.core.management.base import BaseCommand


from oauth2_provider.models import get_application_model, AbstractApplication
from accounts.models import CustomUser
import os

# retrieves the application model for auth
Application = get_application_model() 

class Command(BaseCommand):

    def handle(self, *args, **options):

        user = CustomUser.objects.first()
        app = Application(
            user=user,
            client_type=AbstractApplication.CLIENT_CONFIDENTIAL,
            hash_client_secret=False,
            authorization_grant_type=AbstractApplication.GRANT_PASSWORD,
        )
        os.environ["CLIENT_ID"] = app.client_id
        os.environ["CLIENT_SECRET"] = app.client_secret
        app.save()
        print("Authentication application successfully created.")
    