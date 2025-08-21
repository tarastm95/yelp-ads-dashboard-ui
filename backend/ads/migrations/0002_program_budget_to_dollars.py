from decimal import Decimal
from django.db import migrations


def forwards(apps, schema_editor):
    Program = apps.get_model('ads', 'Program')
    for program in Program.objects.all():
        if program.budget is not None:
            program.budget = program.budget / Decimal('100')
            program.save(update_fields=['budget'])


def backwards(apps, schema_editor):
    Program = apps.get_model('ads', 'Program')
    for program in Program.objects.all():
        if program.budget is not None:
            program.budget = program.budget * Decimal('100')
            program.save(update_fields=['budget'])


class Migration(migrations.Migration):

    dependencies = [
        ('ads', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
