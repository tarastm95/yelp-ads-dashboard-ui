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


class Business(models.Model):
    """
    Кеш business details з Yelp Fusion API.
    Окрема таблиця для нормалізації (один бізнес → багато програм).
    """
    yelp_business_id = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    url = models.URLField(max_length=500, null=True, blank=True)
    alias = models.CharField(max_length=255, null=True, blank=True)
    
    # Metadata
    cached_at = models.DateTimeField(auto_now=True, help_text="Last updated from API")
    fetch_failed = models.BooleanField(default=False, help_text="API fetch failed")
    
    class Meta:
        db_table = 'ads_business'
        indexes = [
            models.Index(fields=['yelp_business_id', 'name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.yelp_business_id})"


class ProgramRegistry(models.Model):
    """
    Реєстр програм Yelp для швидкого сортування.
    Зберігає program_id, business_id, статус та тип програми для швидкої фільтрації.
    Решту даних витягуємо через API.
    """
    
    # User association
    username = models.CharField(max_length=255, db_index=True)
    
    # Program info
    program_id = models.CharField(max_length=100, db_index=True)
    yelp_business_id = models.CharField(max_length=100, db_index=True, null=True, blank=True)
    business_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Business name from Yelp Fusion API (deprecated, use business FK)"
    )
    business = models.ForeignKey(
        'Business',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='programs',
        help_text="Link to business details"
    )
    
    # Program details for filtering
    status = models.CharField(
        max_length=20,
        db_index=True,
        null=True,
        blank=True,
        help_text="Program status: CURRENT, PAST, FUTURE, PAUSED"
    )
    program_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Program type: CPC, BP, etc."
    )
    
    # Program dates
    start_date = models.DateField(
        null=True,
        blank=True,
        help_text="Program start date"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Program end date"
    )
    
    # Program status details
    program_status = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text="Program status from API: ACTIVE, INACTIVE, etc."
    )
    program_pause_status = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Pause status: NOT_PAUSED, PAUSED, etc."
    )
    
    # Program metrics (for CPC programs)
    budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Program budget in dollars"
    )
    currency = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        default="USD",
        help_text="Currency code"
    )
    is_autobid = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether autobidding is enabled"
    )
    max_bid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum bid amount in dollars"
    )
    billed_impressions = models.IntegerField(
        null=True,
        blank=True,
        default=0,
        help_text="Total billed impressions"
    )
    billed_clicks = models.IntegerField(
        null=True,
        blank=True,
        default=0,
        help_text="Total billed clicks"
    )
    ad_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        default=0,
        help_text="Total ad cost in dollars"
    )
    fee_period = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Fee period: Calendar Month, Not Billed, etc."
    )
    
    # Business details
    partner_business_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Partner business ID"
    )
    
    # Features (stored as JSON)
    active_features = models.JSONField(
        null=True,
        blank=True,
        default=list,
        help_text="List of active features"
    )
    available_features = models.JSONField(
        null=True,
        blank=True,
        default=list,
        help_text="List of available features"
    )
    businesses = models.JSONField(
        null=True,
        blank=True,
        default=list,
        help_text="List of businesses associated with this program"
    )
    
    # Custom name (user-editable)
    custom_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Custom name for the program (user-editable)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('username', 'program_id')
        indexes = [
            # Існуючі індекси
            models.Index(fields=['username', 'yelp_business_id']),
            models.Index(fields=['username', 'program_id']),
            models.Index(fields=['username', 'status']),
            models.Index(fields=['username', 'yelp_business_id', 'status']),
            
            # Нові індекси для оптимізації
            models.Index(fields=['username', 'program_name']),  # Фільтр по типу програми
            models.Index(fields=['username', 'status', 'program_name']),  # Комбінований фільтр
            models.Index(fields=['username', 'yelp_business_id', 'program_name']),  # Бізнес + тип
            models.Index(fields=['username', 'yelp_business_id', 'status', 'program_name']),  # Повний фільтр
            models.Index(fields=['yelp_business_id', 'business_name']),  # Для завантаження business_names
            models.Index(fields=['username', 'program_status']),  # Фільтр по program_status з API
            models.Index(fields=['username', 'start_date']),  # Сортування по даті початку
            models.Index(fields=['username', 'updated_at']),  # Для пошуку останніх оновлень
            models.Index(fields=['username', 'status', '-start_date']),  # Для сортування по даті з фільтром
        ]
    
    def __str__(self):
        return f"{self.username}: {self.program_id} ({self.yelp_business_id})"


class YelpProgram(models.Model):
    """[DEPRECATED] Стара складна модель - використовуй ProgramRegistry"""
    
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


class CustomSuggestedKeyword(models.Model):
    """Store custom suggested keywords for negative keyword targeting"""
    
    program_id = models.CharField(max_length=100, db_index=True)
    keyword = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)  # username who added it
    
    class Meta:
        unique_together = ['program_id', 'keyword']
        indexes = [
            models.Index(fields=['program_id']),
            models.Index(fields=['keyword']),
        ]
    
    def __str__(self):
        return f"{self.program_id} - {self.keyword}"


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


class LogEntry(models.Model):
    """Store application logs in database for easy viewing and debugging"""
    
    LEVEL_CHOICES = [
        ('DEBUG', 'Debug'),
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ]
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, db_index=True)
    logger_name = models.CharField(max_length=100, db_index=True)
    message = models.TextField()
    path = models.CharField(max_length=500, null=True, blank=True)
    method = models.CharField(max_length=10, null=True, blank=True)
    status_code = models.IntegerField(null=True, blank=True)
    user = models.CharField(max_length=100, null=True, blank=True)
    duration = models.FloatField(null=True, blank=True, help_text="Request duration in seconds")
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Log Entry'
        verbose_name_plural = 'Log Entries'
        indexes = [
            models.Index(fields=['-timestamp', 'level']),
            models.Index(fields=['level', '-timestamp']),
        ]
    
    def __str__(self):
        return f"[{self.level}] {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')} - {self.message[:50]}"


class ScheduledPause(models.Model):
    """Schedule program pause in the future"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('EXECUTED', 'Executed'),
        ('CANCELLED', 'Cancelled'),
        ('FAILED', 'Failed'),
    ]
    
    program_id = models.CharField(max_length=100, db_index=True)
    username = models.CharField(max_length=255, db_index=True)
    scheduled_datetime = models.DateTimeField(db_index=True, help_text="Date and time when program should be paused")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    executed_at = models.DateTimeField(null=True, blank=True, help_text="When the pause was actually executed")
    error_message = models.TextField(null=True, blank=True, help_text="Error message if execution failed")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['program_id', 'status']),
            models.Index(fields=['scheduled_datetime', 'status']),
            models.Index(fields=['username', 'status']),
        ]
        ordering = ['scheduled_datetime']
    
    def __str__(self):
        return f"{self.program_id} - pause at {self.scheduled_datetime}"


class ScheduledBudgetUpdate(models.Model):
    """Schedule program parameters update in the future"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('EXECUTED', 'Executed'),
        ('CANCELLED', 'Cancelled'),
        ('FAILED', 'Failed'),
    ]
    
    program_id = models.CharField(max_length=100, db_index=True)
    username = models.CharField(max_length=255, db_index=True)
    new_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="New budget amount in cents")
    is_autobid = models.BooleanField(null=True, blank=True, help_text="Automatic bidding enabled")
    max_bid = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Max bid in cents (for manual bidding)")
    pacing_method = models.CharField(max_length=20, null=True, blank=True, help_text="Pacing method: paced or unpaced")
    scheduled_datetime = models.DateTimeField(db_index=True, help_text="Date and time when update should be applied")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    executed_at = models.DateTimeField(null=True, blank=True, help_text="When the update was actually executed")
    error_message = models.TextField(null=True, blank=True, help_text="Error message if execution failed")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['program_id', 'status']),
            models.Index(fields=['scheduled_datetime', 'status']),
            models.Index(fields=['username', 'status']),
        ]
        ordering = ['scheduled_datetime']
    
    def __str__(self):
        return f"{self.program_id} - budget update to ${self.new_budget/100} at {self.scheduled_datetime}"
