from django.db import models

class Program(models.Model):
    job_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    budget = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50)
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
