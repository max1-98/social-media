from django.core.management.base import BaseCommand
from accounts.models import CustomUser

class Command(BaseCommand):

    help = 'Creates a superuser with email input.'
    app_name = 'accounts' 
    def handle(self, *args, **options):
        email = input("Enter email: ")
        username = input("Enter username: ")
        password = input("Enter password: ")
        
        user = CustomUser.objects.create_superuser(
            username=username,
            email=email,
            password=password,
        )
        
        self.stdout.write(self.style.SUCCESS(f'Superuser {username} created successfully.'))
