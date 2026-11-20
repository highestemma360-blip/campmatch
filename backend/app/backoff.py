"""
Campmatch Exponential Backoff

Retry decorator with exponential backoff and jitter for external API calls
and database operations that may fail transiently.
"""

import functools
import random
import time
from typing import Callable, Type, Tuple


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    """
    Decorator that retries a function with exponential backoff.

    delay = min(base_delay * backoff_factor^attempt, max_delay)
    With jitter: delay = random(0, delay)
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as exc:
                    last_exc = exc
                    if attempt == max_retries:
                        break
                    delay = min(base_delay * (backoff_factor**attempt), max_delay)
                    if jitter:
                        delay = random.uniform(0, delay)
                    time.sleep(delay)
            raise last_exc

        return wrapper

    return decorator


async def async_retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    """Async version of retry_with_backoff."""

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            import asyncio

            last_exc = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except retryable_exceptions as exc:
                    last_exc = exc
                    if attempt == max_retries:
                        break
                    delay = min(base_delay * (backoff_factor**attempt), max_delay)
                    if jitter:
                        delay = random.uniform(0, delay)
                    await asyncio.sleep(delay)
            raise last_exc

        return wrapper

    return decorator
