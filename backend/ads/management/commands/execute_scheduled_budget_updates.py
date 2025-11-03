from django.core.management.base import BaseCommand
from django.utils import timezone
from ads.models import ScheduledBudgetUpdate
from ads.services import YelpService
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Execute scheduled budget updates that are due'

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
            self.style.SUCCESS(f'Checking for scheduled budget updates every {check_interval} seconds...')
        )

        while True:
            try:
                now = timezone.now()
                # Get all pending updates that should be executed (within the last minute to account for delays)
                due_updates = ScheduledBudgetUpdate.objects.filter(
                    status='PENDING',
                    scheduled_datetime__lte=now + timedelta(minutes=1)
                ).order_by('scheduled_datetime')

                for update in due_updates:
                    try:
                        # Build update parameters
                        update_params = {}
                        
                        if update.new_budget is not None:
                            budget_dollars = float(update.new_budget) / 100
                            update_params['budget'] = int(update.new_budget)  # In cents
                            
                        if update.is_autobid is not None:
                            if update.is_autobid:
                                update_params['is_autobid'] = True
                                # Clear max_bid when switching to auto
                                update_params['max_bid'] = None
                            else:
                                update_params['is_autobid'] = False
                                if update.max_bid is not None:
                                    update_params['max_bid'] = int(update.max_bid)  # In cents
                        
                        if update.pacing_method:
                            update_params['pacing'] = update.pacing_method
                        
                        self.stdout.write(
                            self.style.WARNING(
                                f'Executing scheduled program update for program {update.program_id} '
                                f'(scheduled for {update.scheduled_datetime}): {update_params}'
                            )
                        )

                        # Execute the update
                        result = YelpService.edit_program(update.program_id, update_params)
                        
                        # Update status
                        update.status = 'EXECUTED'
                        update.executed_at = timezone.now()
                        update.save()

                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Successfully updated program {update.program_id}'
                            )
                        )
                        logger.info(
                            f'Successfully executed scheduled program update for program {update.program_id}'
                        )

                    except Exception as e:
                        # Mark as failed but don't retry automatically
                        update.status = 'FAILED'
                        update.error_message = str(e)
                        update.save()

                        self.stdout.write(
                            self.style.ERROR(
                                f'Failed to update budget for program {update.program_id}: {e}'
                            )
                        )
                        logger.error(
                            f'Failed to execute scheduled budget update for program {update.program_id}: {e}'
                        )

                # Sleep for the check interval
                import time
                time.sleep(check_interval)

            except KeyboardInterrupt:
                self.stdout.write(self.style.SUCCESS('\nStopping scheduled budget update executor...'))
                break
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error in scheduled budget update executor: {e}')
                )
                logger.error(f'Error in scheduled budget update executor: {e}')
                import time
                time.sleep(check_interval)

