import logging
import re
from typing import Any

SENSITIVE_PATH = re.compile(r"(/api/v1/(?:public/passports|downloads)/)[^/?\s]+", re.IGNORECASE)


class RedactAccessTokenFilter(logging.Filter):
    """Masque les jetons portés par les chemins dans les journaux d'accès Uvicorn."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple) and len(record.args) >= 3:
            values: list[Any] = list(record.args)
            values[2] = SENSITIVE_PATH.sub(r"\1[REDACTED]", str(values[2]))
            record.args = tuple(values)
        elif isinstance(record.msg, str):
            record.msg = SENSITIVE_PATH.sub(r"\1[REDACTED]", record.msg)
        return True


def install_access_log_redaction() -> None:
    logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(item, RedactAccessTokenFilter) for item in logger.filters):
        logger.addFilter(RedactAccessTokenFilter())
