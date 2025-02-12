from django.contrib import admin

from .models import Game, GameType

# Register your models here.

admin.site.register(Game)
admin.site.register(GameType)
