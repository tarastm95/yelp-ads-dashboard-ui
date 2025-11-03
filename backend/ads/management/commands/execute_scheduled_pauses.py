from django.core.management.base import BaseCommand
from django.utils import timezone
from ads.models import ScheduledPause
from ads.services import YelpService
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Execute scheduled pauses for programs that are due'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-interval',
            type=int,
            default=60,
            help='Check interval in seconds (default: 60)',
        )

    def handle(self, *args, **options):
        check_interval = options['check_interval']
        
        self.stdout.write(
            self.style.SUCCESS(f'Checking for scheduled pauses every {check_interval} seconds...')
        )

        while True:
            try:
                now = timezone.now()
                # Get all pending pauses that should be executed (within the last minute to account for delays)
                due_pauses = ScheduledPause.objects.filter(
                    status='PENDING',
                    scheduled_datetime__lte=now + timedelta(minutes=1)
                ).order_by('scheduled_datetime')

                for pause in due_pauses:
                    try:
                        self.stdout.write(
                            self.style.WARNING(
                                f'Executing scheduled pause for program {pause.program_id} '
                                f'(scheduled for {pause.scheduled_datetime})'
                            )
                        )

                        # Execute the pause
                        result = YelpService.pause_program(pause.program_id)
                        
                        # Update status
                        pause.status = 'EXECUTED'
                        pause.executed_at = timezone.now()
                        pause.save()

                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Successfully paused program {pause.program_id}'
                            )
                        )
                        logger.info(
                            f'Successfully executed scheduled pause for program {pause.program_id}'
                        )

                    except Exception as e:
                        # Mark as failed but don't retry automatically
                        pause.status = 'FAILED'
                        pause.error_message = str(e)
                        pause.save()

                        self.stdout.write(
                            self.style.ERROR(
                                f'Failed to pause program {pause.program_id}: {e}'
                            )
                        )
                        logger.error(
                            f'Failed to execute scheduled pause for program {pause.program_id}: {e}'
                        )

                # Sleep for the check interval
                import time
                time.sleep(check_interval)

            except KeyboardInterrupt:
                self.stdout.write(self.style.SUCCESS('\nStopping scheduled pause executor...'))
                break
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error in scheduled pause executor: {e}')
                )
                logger.error(f'Error in scheduled pause executor: {e}')
                import time
                time.sleep(check_interval)

