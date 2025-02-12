from celery.result import AsyncResult

def get_task_info(task_id):
    """
    return task info according to the task_id
    """
    task = AsyncResult(task_id)
    state = task.state

    if state == 'FAILURE':
        error = str(task.result)
        response = {
            'state': state,
            'error': error,
        }
    else:
        response = {
            'state': state,
        }
    return response
