from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Program',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job_id', models.CharField(max_length=100, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('budget', models.DecimalField(max_digits=12, decimal_places=2)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(max_length=50)),
                ('partner_program_id', models.CharField(max_length=100, null=True, blank=True)),
                ('status_data', models.JSONField(null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job_id', models.CharField(max_length=100, unique=True)),
                ('period', models.CharField(max_length=10)),
                ('requested_at', models.DateTimeField(auto_now_add=True)),
                ('data', models.JSONField()),
            ],
        ),
        migrations.CreateModel(
            name='PartnerCredential',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.CharField(max_length=255)),
                ('password', models.CharField(max_length=255)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
