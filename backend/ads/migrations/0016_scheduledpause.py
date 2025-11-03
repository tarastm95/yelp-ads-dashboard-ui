# Generated manually for ScheduledPause model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ads', '0015_programregistry_ads_program_usernam_cb2094_idx'),
    ]

    operations = [
        migrations.CreateModel(
            name='ScheduledPause',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('program_id', models.CharField(db_index=True, max_length=100)),
                ('username', models.CharField(db_index=True, max_length=255)),
                ('scheduled_datetime', models.DateTimeField(db_index=True, help_text='Date and time when program should be paused')),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('EXECUTED', 'Executed'), ('CANCELLED', 'Cancelled'), ('FAILED', 'Failed')], db_index=True, default='PENDING', max_length=20)),
                ('executed_at', models.DateTimeField(blank=True, help_text='When the pause was actually executed', null=True)),
                ('error_message', models.TextField(blank=True, help_text='Error message if execution failed', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['scheduled_datetime'],
            },
        ),
        migrations.AddIndex(
            model_name='scheduledpause',
            index=models.Index(fields=['program_id', 'status'], name='ads_schedul_program_status_idx'),
        ),
        migrations.AddIndex(
            model_name='scheduledpause',
            index=models.Index(fields=['scheduled_datetime', 'status'], name='ads_schedul_schedule_status_idx'),
        ),
        migrations.AddIndex(
            model_name='scheduledpause',
            index=models.Index(fields=['username', 'status'], name='ads_schedul_usernam_status_idx'),
        ),
    ]

