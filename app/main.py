# APPENDIX: How to apply the Apache License to your work.
#
#    To apply the Apache License to your work, attach the following
#    boilerplate notice, with the fields enclosed by brackets "{}"
#    replaced with your own identifying information. (Don’t include
#    the brackets!)  The text should be enclosed in the appropriate
#    comment syntax for the file format. We also recommend that a
#    file or class name and description of purpose be included on
#    the same "printed page" as the copyright notice for easier
#    identification within third-party archives.
#
#    Copyright 2025 Pedro A. Pernías
#
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#
#        http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing,
#    software distributed under the License is distributed on an
#    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#    KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations
#    under the License.


from typing import Optional
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.api import api_router
from app.api.web import router as web_router
from app.core.config import settings
from app.db.init_db import init_db
from app.db.session import engine
from app.db.base import Base
from app.core.logging import setup_logging
from app.core.errors import ScolaiaError, handle_exception

# Setup logging
# Create logs directory if it doesn't exist and configure the logging system
log_path = Path(__file__).parent.parent / "logs"
log_path.mkdir(exist_ok=True)
setup_logging(log_path=log_path)

# Initialize the FastAPI application with metadata
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
# This allows the API to be accessed from different domains
origins = settings.BACKEND_CORS_ORIGINS
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if isinstance(origins, list) else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount static files
# This makes files in the static directory accessible via /static URL path
app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static",
)

# Exception handlers
@app.exception_handler(ScolaiaError)
async def scolaia_exception_handler(request: Request, exc: ScolaiaError):
    """Handle all Scolaia custom exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": str(exc)}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    return await handle_exception(request, exc)

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(web_router)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize database with first admin user and settings
    async with AsyncSession(engine) as db:
        await init_db(db)
