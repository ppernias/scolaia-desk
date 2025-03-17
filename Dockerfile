FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    python3-dev \
    libyaml-dev \
    libffi-dev \
    libssl-dev \
    nodejs \
    npm \
    openssl \
    # Dependencies for textract
    antiword \
    poppler-utils \
    tesseract-ocr \
    libjpeg-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Install Node.js dependencies if package.json exists
RUN if [ -f package.json ]; then npm install; fi

# Generate a default SECRET_KEY if not provided
RUN if [ ! -f .env ]; then \
    echo "# Auto-generated .env file - CHANGE THESE VALUES IN PRODUCTION!" > .env && \
    echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env && \
    echo "# Add your OpenAI API key" >> .env && \
    echo "OPENAI_API_KEY=your-openai-api-key" >> .env && \
    echo "# Email configuration" >> .env && \
    echo "SMTP_HOST=your-smtp-host" >> .env && \
    echo "SMTP_USER=your-email" >> .env && \
    echo "SMTP_PASSWORD=your-password" >> .env; \
    fi

# Expose port
EXPOSE 8000

# Create entrypoint script
RUN echo '#!/bin/bash\n\
# Apply database migrations\n\
alembic upgrade head\n\
\n\
# Start the application\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 "$@"\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command (can be overridden)
CMD ["--workers", "4"] 