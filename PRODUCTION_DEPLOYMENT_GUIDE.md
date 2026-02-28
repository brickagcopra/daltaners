# Daltaners Platform — Production VPS Deployment Guide

This guide walks through deploying the full Daltaners platform on a single VPS using Docker Compose. For high-traffic production, consider migrating to Kubernetes (outlined at the end).

---

## VPS Requirements

### Minimum Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 vCPUs | 8 vCPUs |
| **RAM** | 16 GB | 32 GB |
| **Storage** | 100 GB SSD | 200 GB NVMe SSD |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| **Bandwidth** | 1 TB/month | Unmetered |

**Why these specs?** The platform runs 6 infrastructure containers + 10 backend services + 3 frontend apps = 19 containers. PostgreSQL, Elasticsearch, and Cassandra are memory-intensive.

### Recommended VPS Providers

- DigitalOcean (Droplets)
- Hetzner Cloud (best price/performance)
- AWS Lightsail or EC2
- Vultr
- Linode (Akamai)

---

## Step 1: Initial VPS Setup

### 1.1 Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Create a Non-Root User

```bash
adduser daltaners
usermod -aG sudo daltaners
```

### 1.3 Set Up SSH Key Authentication

On your **local machine**:

```bash
ssh-copy-id daltaners@YOUR_VPS_IP
```

### 1.4 Disable Root Login and Password Authentication

```bash
sudo nano /etc/ssh/sshd_config
```

Set:
```
PermitRootLogin no
PasswordAuthentication no
```

```bash
sudo systemctl restart sshd
```

### 1.5 Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Do NOT expose** database ports (5432, 9042, 6379, 9092, 9200) to the internet. They should only be accessible within the Docker network.

### 1.6 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip fail2ban
```

### 1.7 Set Up Fail2Ban

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Step 2: Install Docker

### 2.1 Install Docker Engine

```bash
# Add Docker's official GPG key
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2.2 Add User to Docker Group

```bash
sudo usermod -aG docker daltaners
newgrp docker
```

### 2.3 Verify Docker

```bash
docker --version
docker compose version
```

---

## Step 3: Clone and Configure the Project

### 3.1 Clone the Repository

```bash
sudo su - daltaners
mkdir -p /home/daltaners/apps
cd /home/daltaners/apps
git clone <repository-url> daltaners
cd daltaners
```

### 3.2 Create the Production Environment File

```bash
cp .env.example .env
nano .env
```

**Critical changes for production:**

```bash
# ──────────────────────────────────────────────
# Database — Use strong passwords
# ──────────────────────────────────────────────
POSTGRES_HOST=daltaners-postgres
POSTGRES_PORT=5432
POSTGRES_USER=daltaners
POSTGRES_PASSWORD=<GENERATE_A_STRONG_64_CHAR_PASSWORD>
POSTGRES_DB=daltaners

CASSANDRA_HOST=daltaners-cassandra
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=daltaners_tracking

REDIS_HOST=daltaners-redis
REDIS_PORT=6379
REDIS_PASSWORD=<GENERATE_A_STRONG_PASSWORD>

KAFKA_BROKERS=daltaners-kafka:29092

ELASTICSEARCH_NODE=http://daltaners-elasticsearch:9200

# ──────────────────────────────────────────────
# Security — CHANGE ALL OF THESE
# ──────────────────────────────────────────────
JWT_SECRET=<GENERATE_A_STRONG_256_BIT_SECRET>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# ──────────────────────────────────────────────
# External Services — Add your API keys
# ──────────────────────────────────────────────
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
FCM_PROJECT_ID=daltaners-production
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# ──────────────────────────────────────────────
# Service Ports (internal — not exposed to internet)
# ──────────────────────────────────────────────
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
VENDOR_SERVICE_PORT=3003
CATALOG_SERVICE_PORT=3004
INVENTORY_SERVICE_PORT=3005
ORDER_SERVICE_PORT=3006
DELIVERY_SERVICE_PORT=3007
PAYMENT_SERVICE_PORT=3008
NOTIFICATION_SERVICE_PORT=3010
ZONE_SERVICE_PORT=3014
```

Generate strong passwords:
```bash
openssl rand -base64 48   # For POSTGRES_PASSWORD
openssl rand -base64 48   # For REDIS_PASSWORD
openssl rand -base64 64   # For JWT_SECRET
```

### 3.3 Secure the .env File

```bash
chmod 600 .env
```

---

## Step 4: Configure Docker Compose for Production

### 4.1 Update Infrastructure Passwords

Edit `docker-compose.yml` to match your `.env` passwords:

```bash
nano docker-compose.yml
```

Update the PostgreSQL section:
```yaml
postgres:
  environment:
    POSTGRES_USER: daltaners
    POSTGRES_PASSWORD: <SAME_PASSWORD_AS_IN_ENV>
```

### 4.2 Update Cassandra Replication (Production)

Edit `docker/init-cassandra.cql` — change replication from `SimpleStrategy` to `NetworkTopologyStrategy` if running a multi-node cluster, or at least increase replication factor:

```cql
CREATE KEYSPACE IF NOT EXISTS daltaners_tracking
WITH REPLICATION = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};
```

For a single VPS, `SimpleStrategy` with RF=1 is fine. For multi-node, use RF=3.

### 4.3 Remove Exposed Ports from Infrastructure

For production, infrastructure services should NOT expose ports to the host. Edit `docker-compose.yml` and comment out or remove the `ports:` sections for postgres, redis, kafka, elasticsearch, and cassandra. They only need to be accessible within the Docker network.

```yaml
postgres:
  # ports:             # REMOVE or comment out for production
  #   - '5432:5432'    # Only accessible via Docker network
```

Do this for: postgres, redis, zookeeper, kafka, elasticsearch, cassandra.

---

## Step 5: Build Docker Images

### 5.1 Build All Images

```bash
cd /home/daltaners/apps/daltaners

# Build all backend services and frontend apps
docker compose -f docker-compose.yml -f docker-compose.services.yml build
```

This takes 10–20 minutes on the first build. Subsequent builds use Docker layer caching and are much faster.

### 5.2 Build a Single Service (for partial deploys)

```bash
docker compose -f docker-compose.yml -f docker-compose.services.yml build auth-service
```

---

## Step 6: Start the Platform

### 6.1 Start Infrastructure First

```bash
docker compose up -d
```

### 6.2 Wait for Health Checks

```bash
# Watch until all infrastructure services are healthy
watch docker compose ps
```

Wait until **all 6 services** (postgres, redis, zookeeper, kafka, elasticsearch, cassandra) show `(healthy)`. Cassandra takes the longest (60–90 seconds).

### 6.3 Create Kafka Topics

```bash
docker exec daltaners-kafka bash /docker-entrypoint-initdb.d/init-kafka-topics.sh
```

Verify:
```bash
docker exec daltaners-kafka kafka-topics --list --bootstrap-server localhost:9092
```

### 6.4 Start Application Services

```bash
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d
```

### 6.5 Verify All Services Are Running

```bash
docker compose -f docker-compose.yml -f docker-compose.services.yml ps
```

All 19 containers should be running. Backend services should pass their health checks within 30 seconds.

Test a health endpoint:
```bash
curl http://localhost:3001/api/v1/health/ready
```

---

## Step 7: Set Up Nginx Reverse Proxy

The frontend apps run on ports 8080–8082 and backend services on 3001–3014. You need an Nginx reverse proxy on port 80/443 to route traffic.

### 7.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 7.2 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/daltaners
```

```nginx
# ──────────────────────────────────────────────
# Customer Web — daltaners.com
# ──────────────────────────────────────────────
server {
    listen 80;
    server_name daltaners.com www.daltaners.com;

    # Redirect to HTTPS (enabled after Certbot setup)
    # return 301 https://$host$request_uri;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routing — forward to appropriate backend services
    location /api/v1/auth {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/users {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/stores {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/products {
        proxy_pass http://127.0.0.1:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/categories {
        proxy_pass http://127.0.0.1:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/inventory {
        proxy_pass http://127.0.0.1:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/orders {
        proxy_pass http://127.0.0.1:3006;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/delivery {
        proxy_pass http://127.0.0.1:3007;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/payments {
        proxy_pass http://127.0.0.1:3008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/notifications {
        proxy_pass http://127.0.0.1:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/zones {
        proxy_pass http://127.0.0.1:3014;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for delivery tracking and notifications
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# ──────────────────────────────────────────────
# Admin Panel — admin.daltaners.com
# ──────────────────────────────────────────────
server {
    listen 80;
    server_name admin.daltaners.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Same API routing as customer-web
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ──────────────────────────────────────────────
# Vendor Dashboard — vendor.daltaners.com
# ──────────────────────────────────────────────
server {
    listen 80;
    server_name vendor.daltaners.com;

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Same API routing as customer-web
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Replace** `daltaners.com`, `admin.daltaners.com`, and `vendor.daltaners.com` with your actual domain names.

### 7.3 Enable the Configuration

```bash
sudo ln -s /etc/nginx/sites-available/daltaners /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 8: Set Up SSL with Let's Encrypt

### 8.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificates

```bash
sudo certbot --nginx -d daltaners.com -d www.daltaners.com -d admin.daltaners.com -d vendor.daltaners.com
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose "Redirect all HTTP to HTTPS" when prompted

### 8.3 Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

Certbot automatically sets up a systemd timer for renewal. Certificates renew every 60 days.

---

## Step 9: Set Up Automatic Restarts

### 9.1 Create a Systemd Service for Docker Compose

```bash
sudo nano /etc/systemd/system/daltaners.service
```

```ini
[Unit]
Description=Daltaners Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=daltaners
WorkingDirectory=/home/daltaners/apps/daltaners
ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.services.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.services.yml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable daltaners
```

Now the entire platform starts automatically on server boot.

---

## Step 10: Set Up Monitoring and Logs

### 10.1 View Service Logs

```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.services.yml logs -f

# Specific service
docker compose -f docker-compose.yml -f docker-compose.services.yml logs -f auth-service

# Last 100 lines
docker compose -f docker-compose.yml -f docker-compose.services.yml logs --tail 100 auth-service
```

### 10.2 Configure Log Rotation for Docker

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

```bash
sudo systemctl restart docker
```

### 10.3 Monitor Resource Usage

```bash
# Real-time container resource usage
docker stats

# Disk usage
docker system df
```

### 10.4 Set Up Disk Cleanup Cron

```bash
crontab -e
```

Add:
```cron
# Clean up unused Docker images weekly (Sunday at 3 AM)
0 3 * * 0 docker image prune -af --filter "until=168h" >> /home/daltaners/docker-cleanup.log 2>&1
```

---

## Step 11: Set Up Database Backups

### 11.1 PostgreSQL Backup Script

```bash
mkdir -p /home/daltaners/backups
nano /home/daltaners/scripts/backup-postgres.sh
```

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/home/daltaners/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Dump the database
docker exec daltaners-postgres pg_dump \
  -U daltaners \
  -d daltaners \
  --format=custom \
  --compress=9 \
  > "$BACKUP_DIR/daltaners_${TIMESTAMP}.dump"

# Delete backups older than retention period
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] PostgreSQL backup completed: daltaners_${TIMESTAMP}.dump"
```

```bash
chmod +x /home/daltaners/scripts/backup-postgres.sh
```

### 11.2 Schedule Daily Backups

```bash
crontab -e
```

Add:
```cron
# Daily PostgreSQL backup at 2 AM
0 2 * * * /home/daltaners/scripts/backup-postgres.sh >> /home/daltaners/backups/backup.log 2>&1
```

### 11.3 Restore from Backup

```bash
# List available backups
ls -la /home/daltaners/backups/postgres/

# Restore a specific backup
cat /home/daltaners/backups/postgres/daltaners_20260227_020000.dump | \
  docker exec -i daltaners-postgres pg_restore \
    -U daltaners \
    -d daltaners \
    --clean \
    --if-exists
```

---

## Deploying Updates

### Standard Deployment Flow

```bash
cd /home/daltaners/apps/daltaners

# 1. Pull latest code
git pull origin main

# 2. Rebuild only changed services
docker compose -f docker-compose.yml -f docker-compose.services.yml build auth-service user-service

# 3. Rolling restart (one at a time to minimize downtime)
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d --no-deps auth-service
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d --no-deps user-service

# 4. Verify health
curl http://localhost:3001/api/v1/health/ready
curl http://localhost:3002/api/v1/health/ready
```

### Full Rebuild (after major changes)

```bash
cd /home/daltaners/apps/daltaners
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.services.yml build
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d
```

### Rollback

```bash
# Check image history
docker images daltaners/auth-service

# Revert to previous code
git log --oneline -5
git checkout <previous-commit-hash>

# Rebuild and redeploy
docker compose -f docker-compose.yml -f docker-compose.services.yml build auth-service
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d --no-deps auth-service
```

---

## DNS Configuration

Point your domain names to your VPS IP address. Create these DNS records at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | daltaners.com | YOUR_VPS_IP | 300 |
| A | www.daltaners.com | YOUR_VPS_IP | 300 |
| A | admin.daltaners.com | YOUR_VPS_IP | 300 |
| A | vendor.daltaners.com | YOUR_VPS_IP | 300 |
| A | api.daltaners.com | YOUR_VPS_IP | 300 |

---

## Security Checklist

Before going live, verify:

- [ ] `.env` file has strong, unique passwords (not the defaults)
- [ ] `.env` file permissions are `600` (only owner can read)
- [ ] SSH uses key-based authentication (password auth disabled)
- [ ] Firewall only allows ports 22, 80, 443
- [ ] Infrastructure ports (5432, 6379, 9092, 9200, 9042) are NOT exposed to the internet
- [ ] SSL/TLS is enabled on all domains
- [ ] Certbot auto-renewal is working
- [ ] Fail2Ban is active
- [ ] Database backups are scheduled and tested
- [ ] Docker log rotation is configured
- [ ] `JWT_SECRET` is a strong random string (not the default)
- [ ] Backend services do not expose Swagger docs in production (disable in production config)
- [ ] Rate limiting is enabled on all public endpoints

---

## Quick Reference

### Start/Stop Commands

```bash
# Start everything
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d

# Stop everything (preserves data)
docker compose -f docker-compose.yml -f docker-compose.services.yml down

# Stop everything and delete data (DESTRUCTIVE)
docker compose -f docker-compose.yml -f docker-compose.services.yml down -v

# Restart a single service
docker compose -f docker-compose.yml -f docker-compose.services.yml restart auth-service

# View logs
docker compose -f docker-compose.yml -f docker-compose.services.yml logs -f auth-service
```

### Service Port Map (Internal Only)

| Service | Port | Health Check |
|---------|------|-------------|
| auth | 3001 | /api/v1/health/ready |
| user | 3002 | /api/v1/health/ready |
| vendor | 3003 | /api/v1/health/ready |
| catalog | 3004 | /api/v1/health/ready |
| inventory | 3005 | /api/v1/health/ready |
| order | 3006 | /api/v1/health/ready |
| delivery | 3007 | /api/v1/health/ready |
| payment | 3008 | /api/v1/health/ready |
| notification | 3010 | /api/v1/health/ready |
| zone | 3014 | /api/v1/health/ready |
| customer-web | 8080 | /health |
| admin-panel | 8081 | /health |
| vendor-dashboard | 8082 | /health |

---

## Scaling Beyond a Single VPS

When you outgrow a single VPS, consider:

1. **Managed Databases** — Move PostgreSQL, Redis, Elasticsearch to managed services (AWS RDS, ElastiCache, OpenSearch) to reduce VPS load and get automatic backups/failover.

2. **Container Registry** — Push images to Docker Hub, GitHub Container Registry, or AWS ECR. Build once in CI/CD, deploy anywhere.

3. **Kubernetes** — Migrate to a managed Kubernetes cluster (AWS EKS, DigitalOcean Kubernetes, GKE) for horizontal scaling, rolling deployments, and self-healing. The Dockerfiles and health checks are already Kubernetes-ready.

4. **CI/CD Pipeline** — Set up GitHub Actions or GitLab CI to automatically build, test, and deploy on every push to `main`.

5. **CDN** — Put frontend apps behind Cloudflare or AWS CloudFront for global edge caching and DDoS protection.

6. **Load Balancer** — Use a cloud load balancer in front of multiple VPS instances for high availability.
