# ScolaIA - Docker Deployment Guide

This guide explains how to deploy ScolaIA using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/ppernias/scolaia-desk.git
cd scolaia-desk
```

2. Configure environment variables:
```bash
# Copy the example .env file
cp .env.example .env

# Edit the .env file with your settings
nano .env
```

3. Build and start the containers:
```bash
docker-compose up -d
```

4. Access the application at http://localhost:8000

## Configuration

### Environment Variables

Edit the `.env` file to configure the application:

```
# Critical security settings
SECRET_KEY=your-generated-secure-key

# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=your-openai-api-key

# Email configuration
SMTP_HOST=your-smtp-host
SMTP_USER=your-email
SMTP_PASSWORD=your-password
```

### Data Persistence

The application data is stored in the `./data` directory, which is mounted as a volume in the Docker container. This ensures that your data persists even if the container is removed.

## Management Commands

### View logs
```bash
docker-compose logs -f
```

### Restart the application
```bash
docker-compose restart
```

### Stop the application
```bash
docker-compose down
```

### Update to the latest version
```bash
git pull
docker-compose build
docker-compose up -d
```

## Scaling

To run with multiple workers, you can adjust the command in the `docker-compose.yml` file:

```yaml
command: ["--workers", "4"]
```

The number of workers should typically be 2-4× the number of CPU cores.

## Troubleshooting

### Container fails to start

Check the logs for errors:
```bash
docker-compose logs
```

### Database migration issues

You can manually run migrations:
```bash
docker-compose exec scolaia alembic upgrade head
```

### Reset the application

To completely reset the application (this will delete all data):
```bash
docker-compose down
rm -rf ./data
docker-compose up -d
```

## Production Deployment

For production environments, consider the following:

1. Use a reverse proxy (like Nginx) for SSL termination
2. Set up proper monitoring and logging
3. Configure regular backups of the data directory
4. Use Docker Swarm or Kubernetes for high availability

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Notes

- The application uses the SECRET_KEY to encrypt sensitive data in the database and sign authentication tokens.
- In production, always use HTTPS to protect user data in transit.
- Regularly update the Docker image to get security patches. 