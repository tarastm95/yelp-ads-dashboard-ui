from django.contrib import admin
from django.utils.html import format_html
from .models import Program, Report, PartnerCredential, CustomSuggestedKeyword, LogEntry, ProgramRegistry


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('job_id', 'partner_program_id', 'name', 'budget', 'status', 'created_at')
    list_filter = ('status', 'name')
    search_fields = ('job_id', 'partner_program_id')
    readonly_fields = ('created_at',)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('job_id', 'period', 'requested_at')
    list_filter = ('period',)
    search_fields = ('job_id',)
    readonly_fields = ('requested_at',)


@admin.register(PartnerCredential)
class PartnerCredentialAdmin(admin.ModelAdmin):
    list_display = ('username', 'updated_at')
    readonly_fields = ('updated_at',)
    
    def get_readonly_fields(self, request, obj=None):
        # Don't allow editing password directly for security
        if obj:
            return self.readonly_fields + ('password',)
        return self.readonly_fields


@admin.register(ProgramRegistry)
class ProgramRegistryAdmin(admin.ModelAdmin):
    list_display = ('username', 'program_id', 'yelp_business_id', 'created_at')
    list_filter = ('username',)
    search_fields = ('username', 'program_id', 'yelp_business_id')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)


@admin.register(CustomSuggestedKeyword)
class CustomSuggestedKeywordAdmin(admin.ModelAdmin):
    list_display = ('program_id', 'keyword', 'created_at')
    search_fields = ('program_id', 'keyword')
    readonly_fields = ('created_at',)


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'level_colored', 'logger_name', 'message_preview', 'method', 'path', 'status_code', 'duration_display')
    list_filter = ('level', 'logger_name', 'method', 'status_code')
    search_fields = ('message', 'path', 'user')
    readonly_fields = ('timestamp', 'level', 'logger_name', 'message', 'path', 'method', 'status_code', 'user', 'duration')
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)
    list_per_page = 50
    
    def level_colored(self, obj):
        """Show level with color coding"""
        colors = {
            'DEBUG': '#6c757d',
            'INFO': '#0dcaf0',
            'WARNING': '#ffc107',
            'ERROR': '#dc3545',
            'CRITICAL': '#6f42c1',
        }
        color = colors.get(obj.level, '#000000')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.level
        )
    level_colored.short_description = 'Level'
    level_colored.admin_order_field = 'level'
    
    def message_preview(self, obj):
        """Show truncated message"""
        if len(obj.message) > 100:
            return obj.message[:100] + '...'
        return obj.message
    message_preview.short_description = 'Message'
    
    def duration_display(self, obj):
        """Show duration in readable format"""
        if obj.duration is not None:
            if obj.duration < 1:
                return f"{obj.duration * 1000:.0f}ms"
            return f"{obj.duration:.2f}s"
        return '-'
    duration_display.short_description = 'Duration'
    duration_display.admin_order_field = 'duration'
    
    def has_add_permission(self, request):
        # Logs are auto-generated, no manual adding
        return False
    
    def has_change_permission(self, request, obj=None):
        # Logs are read-only
        return False
