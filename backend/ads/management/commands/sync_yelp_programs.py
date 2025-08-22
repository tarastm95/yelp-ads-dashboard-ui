import logging
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from ads.models import YelpProgram, ProgramSyncLog, SyncSettings
from ads.services import YelpService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Синхронізувати програми з Yelp Partner API'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--mode', 
            choices=['full', 'incremental', 'recent'],
            default='incremental',
            help='Режим синхронізації'
        )
        parser.add_argument(
            '--hours', 
            type=int, 
            default=24,
            help='Кількість годин для режиму recent'
        )
        parser.add_argument(
            '--limit', 
            type=int, 
            default=None,
            help='Максимальна кількість програм'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Примусова повна синхронізація'
        )
    
    def handle(self, *args, **options):
        mode = options['mode']
        
        if options['force']:
            mode = 'full'
            
        sync_log = ProgramSyncLog.objects.create(
            sync_type=mode.upper()
        )
        
        try:
            if mode == 'full':
                self.full_sync(sync_log, options)
            elif mode == 'incremental':
                self.incremental_sync(sync_log, options)
            elif mode == 'recent':
                self.recent_sync(sync_log, options)
                
        except Exception as e:
            sync_log.status = 'FAILED'
            sync_log.errors.append(str(e))
            sync_log.save()
            self.stdout.write(self.style.ERROR(f'Помилка: {str(e)}'))
            raise
    
    def full_sync(self, sync_log, options):
        """Повна синхронізація всіх програм"""
        self.stdout.write('🔄 Починаємо повну синхронізацію...')
        
        if options['force']:
            YelpProgram.objects.all().delete()
            self.stdout.write('🗑️ Очищено всі існуючі дані')
        
        # Отримуємо загальну кількість
        first_batch = YelpService.get_all_programs(0, 40, 'ALL')
        total_count = first_batch.get('total_count', 0)
        sync_log.total_programs = total_count
        sync_log.save()
        
        self.stdout.write(f'📊 Знайдено {total_count} програм')
        
        # Синхронізуємо всі програми
        synced_count = 0
        offset = 0
        limit = 40
        
        while offset < total_count:
            try:
                if offset == 0:
                    batch = first_batch
                else:
                    batch = YelpService.get_all_programs(offset, limit, 'ALL')
                
                programs = batch.get('programs', [])
                if not programs:
                    break
                
                counts = self.sync_batch(programs)
                synced_count += counts['synced']
                sync_log.synced_programs = synced_count
                sync_log.updated_programs += counts['updated']
                sync_log.save()
                
                offset += limit
                self.stdout.write(f'📈 {synced_count}/{total_count} програм...')
                
            except Exception as e:
                self.handle_sync_error(sync_log, offset, e)
                offset += limit
        
        # Позначаємо видалені програми
        deleted_count = self.mark_deleted_programs()
        sync_log.deleted_programs = deleted_count
        
        self.complete_sync(sync_log, synced_count)
        
        # Оновлюємо час останньої синхронізації
        SyncSettings.set_setting('last_full_sync', timezone.now().isoformat())
    
    def incremental_sync(self, sync_log, options):
        """Інкрементальна синхронізація тільки нових/змінених програм"""
        self.stdout.write('⚡ Починаємо інкрементальну синхронізацію...')
        
        # Перевіряємо чи була повна синхронізація
        last_full_sync = SyncSettings.get_setting('last_full_sync')
        if not last_full_sync:
            self.stdout.write('⚠️ Не знайдено попередньої синхронізації. Виконуємо повну.')
            return self.full_sync(sync_log, options)
        
        # Знаходимо програми що потребують оновлення
        cutoff_time = timezone.now() - timedelta(hours=options.get('hours', 24))
        programs_to_check = YelpProgram.objects.filter(
            Q(last_synced__lt=cutoff_time) | Q(program_status='ACTIVE')
        ).values_list('program_id', flat=True)
        
        self.stdout.write(f'🔍 Перевіряємо {len(programs_to_check)} програм...')
        
        # Оновлюємо тільки ці програми
        synced_count = 0
        for program_id in programs_to_check:
            try:
                # Отримуємо інформацію про програму з API
                program_data = YelpService.get_partner_program_info(program_id)
                if program_data.get('programs'):
                    counts = self.sync_batch(program_data['programs'])
                    synced_count += counts['synced']
                    sync_log.updated_programs += counts['updated']
            except Exception as e:
                self.handle_sync_error(sync_log, program_id, e)
        
        self.complete_sync(sync_log, synced_count)
        SyncSettings.set_setting('last_incremental_sync', timezone.now().isoformat())
    
    def recent_sync(self, sync_log, options):
        """Синхронізація тільки останніх програм"""
        hours = options.get('hours', 24)
        self.stdout.write(f'🕒 Синхронізація програм за останні {hours} годин...')
        
        # Завантажуємо тільки активні програми
        batch = YelpService.get_all_programs(0, 40, 'CURRENT')
        programs = batch.get('programs', [])
        
        counts = self.sync_batch(programs)
        self.complete_sync(sync_log, counts['synced'])
    
    def sync_batch(self, programs):
        """Синхронізувати batch програм"""
        synced = 0
        updated = 0
        
        for program_data in programs:
            try:
                program_id = program_data.get('program_id')
                if not program_id:
                    continue
                
                # Витягуємо дані
                businesses = program_data.get('businesses', [])
                yelp_business_id = businesses[0].get('yelp_business_id') if businesses else None
                partner_business_id = businesses[0].get('partner_business_id') if businesses else None
                metrics = program_data.get('program_metrics', {})
                
                # Створюємо або оновлюємо
                program, created = YelpProgram.objects.update_or_create(
                    program_id=program_id,
                    defaults={
                        'program_type': program_data.get('program_type'),
                        'program_status': program_data.get('program_status'),
                        'program_pause_status': program_data.get('program_pause_status', 'NOT_PAUSED'),
                        'yelp_business_id': yelp_business_id,
                        'partner_business_id': partner_business_id,
                        'start_date': program_data.get('start_date'),
                        'end_date': program_data.get('end_date'),
                        'active_features': program_data.get('active_features', []),
                        'available_features': program_data.get('available_features', []),
                        'budget': metrics.get('budget'),
                        'currency': metrics.get('currency', 'USD'),
                        'is_autobid': metrics.get('is_autobid'),
                        'max_bid': metrics.get('max_bid'),
                        'fee_period': metrics.get('fee_period'),
                        'billed_impressions': metrics.get('billed_impressions'),
                        'billed_clicks': metrics.get('billed_clicks'),
                        'ad_cost': metrics.get('ad_cost'),
                        'future_budget_changes': program_data.get('future_budget_changes', []),
                        'is_deleted': False,
                    }
                )
                
                if created:
                    synced += 1
                else:
                    updated += 1
                    
            except Exception as e:
                logger.error(f'Помилка синхронізації програми {program_id}: {e}')
        
        return {'synced': synced, 'updated': updated}
    
    def mark_deleted_programs(self):
        """Позначити програми як видалені, якщо їх немає в API"""
        # Тільки для повної синхронізації
        cutoff_time = timezone.now() - timedelta(hours=1)
        deleted_count = YelpProgram.objects.filter(
            last_synced__lt=cutoff_time,
            is_deleted=False
        ).update(is_deleted=True)
        
        return deleted_count
    
    def handle_sync_error(self, sync_log, identifier, error):
        """Обробка помилок синхронізації"""
        error_msg = f'Помилка {identifier}: {str(error)}'
        logger.error(error_msg)
        sync_log.errors.append(error_msg)
        sync_log.save()
    
    def complete_sync(self, sync_log, synced_count):
        """Завершення синхронізації"""
        sync_log.synced_programs = synced_count
        sync_log.status = 'COMPLETED'
        sync_log.completed_at = timezone.now()
        sync_log.save()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Синхронізація завершена! '
                f'Синхронізовано: {synced_count}, '
                f'Оновлено: {sync_log.updated_programs}, '
                f'Видалено: {sync_log.deleted_programs}'
            )
        )
