import os
from threading import Semaphore


def _load_max_concurrency() -> int:
    raw_value = os.getenv("RENDER_MAX_CONCURRENCY", "1").strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        return 1
    return max(1, parsed)


RENDER_MAX_CONCURRENCY = _load_max_concurrency()
RENDER_WORKER_SEMAPHORE = Semaphore(RENDER_MAX_CONCURRENCY)


def try_acquire_render_slot() -> bool:
    return RENDER_WORKER_SEMAPHORE.acquire(blocking=False)


def release_render_slot() -> None:
    RENDER_WORKER_SEMAPHORE.release()
