from django.contrib import admin
from .models import Program, Report, PartnerCredential, CustomSuggestedKeyword

admin.site.register(Program)
admin.site.register(Report)
admin.site.register(PartnerCredential)
admin.site.register(CustomSuggestedKeyword)
