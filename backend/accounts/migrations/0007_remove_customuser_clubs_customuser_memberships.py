# Generated by Django 5.1.1 on 2024-11-12 11:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_customuser_clubs'),
        ('clubs', '0023_member_is_admin_member_is_member'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='clubs',
        ),
        migrations.AddField(
            model_name='customuser',
            name='memberships',
            field=models.ManyToManyField(related_name='memberships', to='clubs.member'),
        ),
    ]
