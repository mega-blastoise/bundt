# Deploying prev Playground to EC2

## Prerequisites
- AWS EC2 instance (t3.micro or t4g.small is sufficient)
- Docker installed on EC2
- Domain: `playground.bundt-dev.io`
- ACM cert for `*.bundt-dev.io` (same cert used for landing/docs)

## Manual Deploy (First Time)

### 1. EC2 Setup
```bash
# SSH into EC2
ssh -i ~/.ssh/bundt-playground.pem ec2-user@<EC2_IP>

# Install Docker (Amazon Linux 2023)
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
# Log out and back in for group change
```

### 2. Build & Push Image
```bash
# From monorepo root
docker build -f websites/playground/Dockerfile -t prev-playground .

# Tag for GHCR
docker tag prev-playground ghcr.io/mega-blastoise/bundt/prev-playground:latest

# Log in to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u mega-blastoise --password-stdin

# Push
docker push ghcr.io/mega-blastoise/bundt/prev-playground:latest
```

### 3. Run on EC2
```bash
# Pull and run
docker pull ghcr.io/mega-blastoise/bundt/prev-playground:latest
docker run -d \
  --name prev-playground \
  --restart unless-stopped \
  -p 80:3000 \
  ghcr.io/mega-blastoise/bundt/prev-playground:latest
```

### 4. DNS & SSL (Route53 + CloudFront or ALB)

**Option A: Direct EC2 (simplest)**
- Route53 A record: `playground.bundt-dev.io` -> EC2 Elastic IP
- Use Caddy or nginx reverse proxy with Let's Encrypt for SSL

**Option B: CloudFront (recommended for SSL)**
- Create CloudFront distribution with EC2 as origin (HTTP, port 80)
- Attach `*.bundt-dev.io` ACM cert
- Route53 A alias: `playground.bundt-dev.io` -> CloudFront distribution

**Option C: ALB**
- Create ALB with target group pointing to EC2:80
- Attach ACM cert to ALB HTTPS listener
- Route53 A alias: `playground.bundt-dev.io` -> ALB

## CI/CD Deploy (GitHub Actions)

The workflow at `.github/workflows/deploy-playground.yml` automates:
1. Build Docker image on push to `main` (when playground or prev changes)
2. Push to GHCR
3. SSH to EC2 and `docker pull` + `docker run`

### Required GitHub Secrets
- `PLAYGROUND_EC2_HOST` — EC2 public IP or hostname
- `PLAYGROUND_EC2_USER` — SSH user (e.g., `ec2-user`)
- `PLAYGROUND_EC2_KEY` — SSH private key content

## Health Check
```bash
curl http://playground.bundt-dev.io/api/presets
# Should return JSON array of 4 presets
```

## Architecture
```
Client Browser
     |
     v
  CloudFront (SSL termination, *.bundt-dev.io cert)
     |
     v
  EC2 (t3.micro, Docker)
     |
     v
  prev-playground container (Bun.serve :3000)
     |-- GET /            Playground HTML
     |-- POST /api/compose  Intent resolver -> SSR frame
     |-- GET /frame/:id   Streaming SSR workspace
     |-- WS /ws           Live interactions + data updates
     |-- GET /api/registry Fragment/source catalog
```
