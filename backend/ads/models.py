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


class ProgramFeature(models.Model):
    """Store program feature configurations"""
    
    FEATURE_TYPES = [
        ('LINK_TRACKING', 'Link Tracking'),
        ('NEGATIVE_KEYWORD_TARGETING', 'Negative Keyword Targeting'),
        ('STRICT_CATEGORY_TARGETING', 'Strict Category Targeting'),
        ('AD_SCHEDULING', 'Ad Scheduling'),
        ('CUSTOM_LOCATION_TARGETING', 'Custom Location Targeting'),
        ('AD_GOAL', 'Ad Goal'),
        ('CALL_TRACKING', 'Call Tracking'),
        ('BUSINESS_HIGHLIGHTS', 'Business Highlights'),
        ('VERIFIED_LICENSE', 'Verified License'),
        ('CUSTOM_RADIUS_TARGETING', 'Custom Radius Targeting'),
        ('CUSTOM_AD_TEXT', 'Custom Ad Text'),
        ('CUSTOM_AD_PHOTO', 'Custom Ad Photo'),
        ('BUSINESS_LOGO', 'Business Logo'),
        ('YELP_PORTFOLIO', 'Yelp Portfolio'),
    ]
    
    program_id = models.CharField(max_length=100, db_index=True)
    feature_type = models.CharField(max_length=50, choices=FEATURE_TYPES)
    configuration = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['program_id', 'feature_type']
        indexes = [
            models.Index(fields=['program_id']),
            models.Index(fields=['feature_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.program_id} - {self.feature_type}"


class PortfolioProject(models.Model):
    """Portfolio projects for Yelp programs"""
    
    CALL_TO_ACTION_CHOICES = [
        ('WEBSITE', 'Website'),
        ('CALL', 'Call'),
        ('BOOK_APPOINTMENT', 'Book Appointment'),
        ('GET_QUOTE', 'Get Quote'),
        ('LEARN_MORE', 'Learn More'),
    ]
    
    COST_CHOICES = [
        ('UNDER_100', 'Under $100'),
        ('100_500', '$100 - $500'),
        ('500_1000', '$500 - $1,000'),
        ('1000_5000', '$1,000 - $5,000'),
        ('5000_PLUS', '$5,000+'),
    ]
    
    DURATION_CHOICES = [
        ('UNDER_1_WEEK', 'Under 1 week'),
        ('1_2_WEEKS', '1-2 weeks'),
        ('2_4_WEEKS', '2-4 weeks'),
        ('1_3_MONTHS', '1-3 months'),
        ('3_PLUS_MONTHS', '3+ months'),
    ]
    
    project_id = models.CharField(max_length=100, unique=True, db_index=True)
    program_id = models.CharField(max_length=100, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField()
    call_to_action = models.CharField(max_length=50, choices=CALL_TO_ACTION_CHOICES)
    service_offerings = models.JSONField(default=list, blank=True)  # Up to 4 offerings
    cost = models.CharField(max_length=20, choices=COST_CHOICES, null=True, blank=True)
    duration = models.CharField(max_length=20, choices=DURATION_CHOICES, null=True, blank=True)
    completion_year = models.IntegerField(null=True, blank=True)
    completion_month = models.IntegerField(null=True, blank=True)
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['program_id']),
            models.Index(fields=['project_id']),
            models.Index(fields=['published']),
        ]
    
    def __str__(self):
        return f"{self.project_id} - {self.name}"


class PortfolioPhoto(models.Model):
    """Photos for portfolio projects"""
    
    photo_id = models.CharField(max_length=100, unique=True, db_index=True)
    project = models.ForeignKey(PortfolioProject, on_delete=models.CASCADE, related_name='photos')
    photo_url = models.URLField(null=True, blank=True)
    biz_photo_id = models.CharField(max_length=100, null=True, blank=True)
    caption = models.TextField(blank=True)
    is_before_photo = models.BooleanField(default=False)
    is_cover_photo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['project']),
            models.Index(fields=['is_cover_photo']),
        ]
    
    def __str__(self):
        return f"{self.photo_id} - {self.project.name}"
