from django.contrib import admin
from .models import ClubModel

@admin.register(ClubModel)
class ClubModelAdmin(admin.ModelAdmin):
    list_display = ('name',)  # Fields to show in the list view
    list_filter = ('name',)  # Filter options
    search_fields = ('name',)  # Search fields

