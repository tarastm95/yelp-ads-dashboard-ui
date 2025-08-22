from django.db import models

class Program(models.Model):
    job_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    budget = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50)
    partner_program_id = models.CharField(max_length=100, null=True, blank=True)
    status_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Report(models.Model):
    job_id = models.CharField(max_length=100, unique=True)
    period = models.CharField(max_length=10)
    requested_at = models.DateTimeField(auto_now_add=True)
    data = models.JSONField()


class PartnerCredential(models.Model):
    """Store plain partner API credentials captured from Basic auth."""

    username = models.CharField(max_length=255)
    password = models.CharField(max_length=255)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover - simple display
        return self.username

class YelpProgram(models.Model):
    """Синхронізовані програми з Yelp Partner API"""
    
    program_id = models.CharField(max_length=100, unique=True, db_index=True)
    program_type = models.CharField(max_length=20, db_index=True)  # CPC, BP, etc.
    program_status = models.CharField(max_length=20, db_index=True)  # ACTIVE, INACTIVE
    program_pause_status = models.CharField(max_length=20, default='NOT_PAUSED')
    
    # Business information
    yelp_business_id = models.CharField(max_length=100, db_index=True, null=True, blank=True)
    partner_business_id = models.CharField(max_length=100, null=True, blank=True)
    
    # Dates
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Features
    active_features = models.JSONField(default=list, blank=True)
    available_features = models.JSONField(default=list, blank=True)
    
    # Metrics (можуть бути null для деяких типів програм)
    budget = models.BigIntegerField(null=True, blank=True)  # В центах
    currency = models.CharField(max_length=10, default='USD')
    is_autobid = models.BooleanField(null=True, blank=True)
    max_bid = models.BigIntegerField(null=True, blank=True)
    fee_period = models.CharField(max_length=50, null=True, blank=True)
    
    # Billing data
    billed_impressions = models.BigIntegerField(null=True, blank=True)
    billed_clicks = models.BigIntegerField(null=True, blank=True)
    ad_cost = models.BigIntegerField(null=True, blank=True)
    
    # Future budget changes
    future_budget_changes = models.JSONField(default=list, blank=True)
    
    # Sync metadata
    last_synced = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)  # Soft delete
    
    class Meta:
        indexes = [
            models.Index(fields=['program_id']),
            models.Index(fields=['program_type', 'program_status']),
            models.Index(fields=['yelp_business_id']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['last_synced']),
            models.Index(fields=['is_deleted']),
        ]
    
    def __str__(self):
        return f"{self.program_type} - {self.program_id}"

class SyncSettings(models.Model):
    """Налаштування синхронізації"""
    
    name = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)
    
    @classmethod
    def get_setting(cls, name, default=None):
        try:
            return cls.objects.get(name=name).value
        except cls.DoesNotExist:
            return default
    
    @classmethod
    def set_setting(cls, name, value):
        obj, created = cls.objects.update_or_create(
            name=name,
            defaults={'value': str(value)}
        )
        return obj

class ProgramSyncLog(models.Model):
    """Лог синхронізації програм"""
    
    SYNC_TYPES = [
        ('FULL', 'Повна синхронізація'),
        ('INCREMENTAL', 'Інкрементальна синхронізація'),
        ('PARTIAL', 'Часткова синхронізація'),
    ]
    
    sync_type = models.CharField(max_length=20, choices=SYNC_TYPES, default='FULL')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_programs = models.IntegerField(default=0)
    synced_programs = models.IntegerField(default=0)
    updated_programs = models.IntegerField(default=0)
    deleted_programs = models.IntegerField(default=0)
    errors = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('RUNNING', 'Виконується'),
        ('COMPLETED', 'Завершено'), 
        ('FAILED', 'Помилка'),
        ('CANCELLED', 'Скасовано'),
    ], default='RUNNING')
    
    def __str__(self):
        return f"{self.sync_type} sync {self.started_at} - {self.status}"
