import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from loguru import logger
from loguru._defaults import LOGURU_FORMAT

class InterceptHandler(logging.Handler):
    """
    Custom logging handler that intercepts all standard logging calls and redirects them to Loguru.
    
    This handler serves as a bridge between Python's standard logging and Loguru,
    ensuring consistent logging behavior across the application. It preserves the original
    logging context and properly handles log levels and stack frames.

    Implementation follows the official Loguru documentation recommendations for
    standard logging compatibility.
    """

    def emit(self, record: logging.LogRecord) -> None:
        """
        Process and emit a logging record through Loguru.

        Args:
            record (logging.LogRecord): The logging record to be processed

        The method performs the following steps:
        1. Determines the appropriate log level
        2. Tracks the correct stack frame for accurate source location
        3. Emits the log message with proper context and formatting
        """
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back  # type: ignore
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

def format_record(record: Dict[str, Any]) -> str:
    """
    Provides custom formatting for Loguru log records.

    Args:
        record (Dict[str, Any]): The log record to format

    Returns:
        str: Formatted log string

    The formatter adds special handling for payload data when present
    and ensures consistent formatting across all log messages.
    """
    format_string = LOGURU_FORMAT
    if record["extra"].get("payload") is not None:
        record["extra"]["payload"] = record["extra"]["payload"]
        format_string += "\nPayload: {extra[payload]}"

    format_string += "\n"
    return format_string

def setup_logging(*, log_path: Optional[Path] = None) -> None:
    """
    Initializes and configures the application-wide logging system.

    Args:
        log_path (Optional[Path]): Path where log files should be stored. 
                                  If None, logs will only be output to console.

    This function:
    1. Replaces the root logger's handlers with our custom InterceptHandler
    2. Configures appropriate log levels
    3. Sets up file logging if a path is provided
    4. Ensures consistent logging behavior across all modules
    """
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(logging.INFO)

    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True

    # Configure loguru
    logger.configure(
        handlers=[
            {
                "sink": sys.stdout,
                "level": logging.INFO,
                "format": format_record,
            },
        ],
    )

    # Add file logging if path is provided
    if log_path:
        logger.add(
            str(log_path / "app.log"),
            rotation="00:00",  # Rotate at midnight
            retention="30 days",
            level=logging.INFO,
            format=format_record,
        )

    return None
