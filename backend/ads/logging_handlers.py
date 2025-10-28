import logging
from django.utils import timezone


class DatabaseLogHandler(logging.Handler):
    """
    Custom logging handler that saves logs to database.
    
    This allows viewing logs through Django Admin interface
    and querying them programmatically.
    """
    
    def emit(self, record):
        """Save log record to database"""
        try:
            # Import here to avoid circular imports
            from .models import LogEntry
            
            # Extract request info if available
            path = getattr(record, 'path', None)
            method = getattr(record, 'method', None)
            status_code = getattr(record, 'status_code', None)
            user = getattr(record, 'user', None)
            duration = getattr(record, 'duration', None)
            
            # Create log entry
            LogEntry.objects.create(
                level=record.levelname,
                logger_name=record.name,
                message=self.format(record),
                path=path,
                method=method,
                status_code=status_code,
                user=user,
                duration=duration,
            )
        except Exception as e:
            # Don't let logging errors break the application
            # Just log to stderr and continue
            import sys
            print(f"Error saving log to database: {e}", file=sys.stderr)
            self.handleError(record)

