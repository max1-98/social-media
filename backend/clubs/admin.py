from django.contrib import admin
from .models import ClubModel, MemberRequest, Member, ClubAdmin

admin.site.register(MemberRequest)
admin.site.register(Member)
admin.site.register(ClubAdmin)

@admin.register(ClubModel)
class ClubModelAdmin(admin.ModelAdmin):
    list_display = ('name',)  # Fields to show in the list view
    list_filter = ('name',)  # Filter options
    search_fields = ('name',)  # Search fields

