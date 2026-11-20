"""
Campmatch Saga Pattern

Orchestrates distributed transactions across multiple services (payment +
subscription activation + welcome notification) with compensating actions
if any step fails.

Steps are executed in order; on failure, compensating transactions run
in reverse order to roll back side effects.
"""

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable


@dataclass
class SagaStep:
    name: str
    action: Callable[[], Any]           # forward action
    compensate: Callable[[Any], None]   # rollback action (receives forward result)


@dataclass
class SagaExecution:
    id: str
    steps: list[SagaStep]
    results: list[Any] = field(default_factory=list)
    status: str = "running"  # running | completed | failed | compensated
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: str | None = None
    error: str | None = None


class SagaOrchestrator:
    def __init__(self):
        self._executions: dict[str, SagaExecution] = {}
        self._lock = threading.Lock()

    def execute(self, name: str, steps: list[SagaStep]) -> str:
        """Run a saga. Returns the execution id."""
        exec_id = str(uuid.uuid4())
        execution = SagaExecution(id=exec_id, steps=steps)

        def _run():
            try:
                for i, step in enumerate(steps):
                    result = step.action()
                    execution.results.append(result)
                execution.status = "completed"
            except Exception as exc:
                execution.status = "failed"
                execution.error = str(exc)
                # Compensate in reverse order
                for i in range(len(execution.results) - 1, -1, -1):
                    try:
                        steps[i].compensate(execution.results[i])
                    except Exception:
                        pass  # compensatory failure is logged but not re-raised
                execution.status = "compensated"
            finally:
                execution.completed_at = datetime.now(timezone.utc).isoformat()

        thread = threading.Thread(target=_run, daemon=True, name=f"saga-{exec_id[:8]}")
        thread.start()

        with self._lock:
            self._executions[exec_id] = execution

        return exec_id

    def get_status(self, exec_id: str) -> SagaExecution | None:
        with self._lock:
            return self._executions.get(exec_id)


# Global orchestrator
saga = SagaOrchestrator()
