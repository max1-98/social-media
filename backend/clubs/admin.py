from django.contrib import admin
from .models import ClubModel, MemberRequest, Member, DummyUser, Sport, ClubStatus

admin.site.register(MemberRequest)
admin.site.register(Member)
admin.site.register(DummyUser)
admin.site.register(Sport)
admin.site.register(ClubStatus)

@admin.register(ClubModel)
class ClubModelAdmin(admin.ModelAdmin):
    list_display = ('name',)  # Fields to show in the list view
    list_filter = ('name',)  # Filter options
    search_fields = ('name',)  # Search fields

