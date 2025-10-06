# Generated migration file

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ads', '0003_programsynclog_syncsettings_yelpprogram'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomSuggestedKeyword',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('program_id', models.CharField(db_index=True, max_length=100)),
                ('keyword', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.CharField(blank=True, max_length=255, null=True)),
            ],
            options={
                'indexes': [
                    models.Index(fields=['program_id'], name='ads_customsu_program_idx'),
                    models.Index(fields=['keyword'], name='ads_customsu_keyword_idx'),
                ],
                'unique_together': {('program_id', 'keyword')},
            },
        ),
    ]
