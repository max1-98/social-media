# Generated by Django 5.1.1 on 2024-11-21 11:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0011_remove_event_sport'),
    ]

    operations = [
        migrations.AlterField(
            model_name='event',
            name='mode',
            field=models.CharField(choices=[('sbmm', 'SBMM'), ('social', 'Social'), ('peg_board', 'Peg Board')], default='sbmm', max_length=50),
        ),
    ]
