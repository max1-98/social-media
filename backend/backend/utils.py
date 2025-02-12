from datetime import datetime, timedelta, date


def is_more_than_four_weeks_ago(date):
    """Checks if a date is more than four weeks ago.  Handles None values gracefully."""
    if date is None:
        return False #Treat None as not being more than 4 weeks ago

    four_weeks_ago = date.today() - timedelta(weeks=4)
    return date < four_weeks_ago

def string_to_date(date_str):
    """Converts a date string to a datetime.date object. Handles None and invalid formats gracefully."""
    if date_str is None:
        return None  # Handle None gracefully
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date() # Convert to date object
    except ValueError:
        #Handle invalid date formats using logging and returning a default value.
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Invalid date string format: {date_str}")
        return None # Or raise an exception, depending on your error-handling strategy