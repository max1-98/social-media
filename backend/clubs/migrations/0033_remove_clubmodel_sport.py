# Generated by Django 4.2 on 2024-12-06 23:19

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('clubs', '0032_rename_last_event_clubstatus_event_dates'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='clubmodel',
            name='sport',
        ),
    ]
