import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict

class JSONFormatter(logging.Formatter):
    """
    Custom formatter that outputs log records as single-line JSON.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "funcName": record.funcName,
            "lineNo": record.lineno,
        }
        
        # Include extra payload if it was passed via logging library
        if hasattr(record, "extra") and isinstance(record.extra, dict): # type: ignore
            log_payload.update(record.extra) # type: ignore

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_payload)

def setup_logging(debug: bool = True) -> logging.Logger:
    """
    Sets up the global application logger configured to output JSON formatted logs.
    """
    root_logger = logging.getLogger()
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Output to stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)

    # Set base level
    level = logging.DEBUG if debug else logging.INFO
    root_logger.setLevel(level)
    
    # Silence third-party verbose logs
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    return logging.getLogger("intel_lens")

logger = setup_logging()
