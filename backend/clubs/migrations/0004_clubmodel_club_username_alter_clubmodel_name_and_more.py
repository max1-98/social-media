# Generated by Django 4.0 on 2024-09-23 09:21

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_alter_customuser_email'),
        ('clubs', '0003_clubmodel_date_created_clubmodel_info_clubmodel_logo_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='clubmodel',
            name='club_username',
            field=models.CharField(default='clubusername', max_length=150),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='clubmodel',
            name='name',
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='clubmodel',
            name='president',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='club_president', to='accounts.customuser'),
        ),
    ]