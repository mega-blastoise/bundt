# bundt Infrastructure Deploy Guide

This is a sequential checklist. Complete each section in order — later steps depend on earlier ones.

**Domain:** `bundt-dev.io`
**Subdomains:** `docs.bundt-dev.io`, `playground.bundt-dev.io`
**Region:** `us-east-1`
**GitHub repo:** `mega-blastoise/bundt`

---

## 1. ACM Certificate

You need one wildcard cert that covers all three domains.

1. Open **AWS Console → Certificate Manager** (switch to **us-east-1**)
2. Click **Request a certificate → Public certificate**
3. Add these domain names:
   - `bundt-dev.io`
   - `*.bundt-dev.io`
4. Select **DNS validation**
5. Click **Request**
6. On the cert detail page, click **Create records in Route 53** for each domain name (this adds the CNAME validation records automatically)
7. Wait for status to change from "Pending validation" to **"Issued"** (usually 2-15 minutes)
8. Copy the **Certificate ARN** — you'll need it for CloudFront

```bash
# Example ARN format:
arn:aws:acm:us-east-1:123456789012:certificate/abc-def-123
```

---

## 2. S3 Buckets

Create two S3 buckets for static site hosting.

```bash
# Landing site bucket
aws s3 mb s3://bundt-dev-io-landing --region us-east-1

# Docs site bucket
aws s3 mb s3://bundt-dev-io-docs --region us-east-1
```

**Do NOT enable S3 static website hosting.** CloudFront will serve the content via OAC (Origin Access Control), which is more secure.

### Bucket policy (apply to both)

Replace `DISTRIBUTION_ID` after creating the CloudFront distributions in step 3.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET_NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

---

## 3. CloudFront Distributions

Create two distributions: one for the landing site, one for docs.

### 3a. Landing site (`bundt-dev.io`)

1. **CloudFront → Create distribution**
2. Origin:
   - Origin domain: `bundt-dev-io-landing.s3.us-east-1.amazonaws.com`
   - Origin access: **Origin access control settings (OAC)** → Create new OAC
   - Name: `bundt-landing-oac`
3. Default cache behavior:
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Cache policy: **CachingOptimized**
   - Response headers policy: **SecurityHeadersPolicy**
4. Settings:
   - Alternate domain names (CNAME): `bundt-dev.io`
   - Custom SSL certificate: select your ACM cert from step 1
   - Default root object: `index.html`
5. Create distribution
6. **Copy the distribution ID** and **distribution domain name** (e.g., `d1234abcdef.cloudfront.net`)

**SPA routing fix:** Create a custom error response:
- Error code: 403 → Response page path: `/index.html` → Response code: 200
- Error code: 404 → Response page path: `/index.html` → Response code: 200

(This handles React Router's client-side routes.)

7. Go back to the S3 bucket `bundt-landing` → Permissions → Bucket policy → paste the policy from step 2 with the distribution ARN filled in.

### 3b. Docs site (`docs.bundt-dev.io`)

Same steps as above, but:
- Origin domain: `bundt-dev-io-docs.s3.us-east-1.amazonaws.com`
- Alternate domain name: `docs.bundt-dev.io`
- Default root object: `index.html`
- **No SPA error response** needed (dxdocs generates static HTML per route)

---

## 4. EC2 for Playground

### 4a. Launch instance

1. **EC2 → Launch instance**
   - Name: `prev-playground`
   - AMI: **Amazon Linux 2023** (arm64 for t4g, x86_64 for t3)
   - Instance type: `t4g.small` (arm64, 2 vCPU, 2 GB — good for Bun) or `t3.micro` (x86_64, free tier)
   - Key pair: create or select one (save the `.pem` file)
   - Security group — create new:
     - SSH (22) from your IP
     - HTTP (80) from anywhere (0.0.0.0/0, ::/0)
     - HTTPS (443) from anywhere (only if terminating SSL on EC2)
   - Storage: 20 GB gp3

2. **Allocate an Elastic IP** and associate it with the instance
   - EC2 → Elastic IPs → Allocate → Associate with `prev-playground`
   - Note the IP address

### 4b. Install Docker

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@ELASTIC_IP

# Install Docker
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Log out and back in for group membership
exit
ssh -i ~/.ssh/your-key.pem ec2-user@ELASTIC_IP

# Verify
docker --version
```

### 4c. First deploy (manual)

```bash
# On your local machine — build and push the image
cd /home/nicks-dgx/dev/bundt

# Build (from monorepo root — the Dockerfile COPYs workspace subsets)
docker build -f websites/playground/Dockerfile -t prev-playground .

# Tag for GHCR
docker tag prev-playground ghcr.io/mega-blastoise/bundt/prev-playground:latest

# Log in to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u mega-blastoise --password-stdin

# Push
docker push ghcr.io/mega-blastoise/bundt/prev-playground:latest
```

```bash
# On EC2 — pull and run
docker login ghcr.io -u mega-blastoise --password-stdin <<< "$GITHUB_TOKEN"
docker pull ghcr.io/mega-blastoise/bundt/prev-playground:latest
docker run -d \
  --name prev-playground \
  --restart unless-stopped \
  -p 80:3000 \
  ghcr.io/mega-blastoise/bundt/prev-playground:latest

# Verify
curl http://localhost/api/presets
# Should return JSON array of presets
```

### 4d. CloudFront for playground (SSL termination)

1. **CloudFront → Create distribution**
2. Origin:
   - Origin domain: `ELASTIC_IP` (enter the IP directly)
   - Protocol: **HTTP only**
   - HTTP port: 80
   - Origin access: **Public** (not OAC — EC2 is not S3)
3. Default cache behavior:
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE** (playground uses POST for compose)
   - Cache policy: **CachingDisabled** (the playground is dynamic)
   - Origin request policy: **AllViewerExceptHostHeader** (forwards all headers except `Host` — EC2 will reject requests where `Host` doesn't match its own hostname)
4. Settings:
   - CNAME: `playground.bundt-dev.io`
   - SSL certificate: select your ACM cert
5. **WebSocket support:** CloudFront supports WebSocket natively — no extra config needed. The `Upgrade: websocket` header passes through with `AllViewerExceptHostHeader`.
6. Create distribution, copy the domain name

---

## 5. Route 53 DNS Records

Open **Route 53 → Hosted zone: bundt-dev.io**

Create three A records (all as **Alias** records):

| Record name | Type | Alias target |
|---|---|---|
| `bundt-dev.io` | A | CloudFront distribution (landing) |
| `docs.bundt-dev.io` | A | CloudFront distribution (docs) |
| `playground.bundt-dev.io` | A | CloudFront distribution (playground) |

For each:
1. Click **Create record**
2. Record type: **A**
3. Toggle **Alias** on
4. Route traffic to: **Alias to CloudFront distribution**
5. Select the matching distribution from the dropdown

---

## 6. Upload Static Sites to S3

```bash
cd /home/nicks-dgx/dev/bundt

# Build landing
cd websites/landing && bun run build && cd ../..

# Build docs (if exists)
cd websites/docs && bun run build && cd ../..

# Sync to S3
aws s3 sync websites/landing/dist/ s3://bundt-dev-io-landing --delete
aws s3 sync websites/docs/dist/ s3://bundt-dev-io-docs --delete

# Invalidate CloudFront caches
aws cloudfront create-invalidation \
  --distribution-id LANDING_DISTRIBUTION_ID \
  --paths "/*"

aws cloudfront create-invalidation \
  --distribution-id DOCS_DISTRIBUTION_ID \
  --paths "/*"
```

---

## 7. GitHub Secrets for CI/CD

Go to **GitHub → mega-blastoise/bundt → Settings → Secrets and variables → Actions**

### For deploy-playground.yml:

| Secret | Value |
|---|---|
| `PLAYGROUND_EC2_HOST` | Elastic IP from step 4a |
| `PLAYGROUND_EC2_USER` | `ec2-user` |
| `PLAYGROUND_EC2_KEY` | Contents of your `.pem` file (paste entire file including BEGIN/END lines) |

### For deploy-websites.yml:

| Secret | Value |
|---|---|
| `AWS_ROLE_ARN` | ARN of an IAM role with S3 + CloudFront permissions (OIDC federation) |
| `LANDING_S3_BUCKET` | `bundt-landing` |
| `LANDING_CF_DISTRIBUTION_ID` | CloudFront distribution ID for landing |
| `DOCS_S3_BUCKET` | `bundt-docs` |
| `DOCS_CF_DISTRIBUTION_ID` | CloudFront distribution ID for docs |

### IAM role for GitHub Actions (OIDC)

This avoids storing AWS access keys as secrets.

1. **IAM → Identity providers → Add provider**
   - Provider type: OpenID Connect
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

2. **IAM → Roles → Create role**
   - Trusted entity: Web identity → select the OIDC provider
   - Condition: `token.actions.githubusercontent.com:sub` → `repo:mega-blastoise/bundt:*`
   - Permissions: attach a policy with:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
           "Resource": [
             "arn:aws:s3:::bundt-dev-io-landing",
             "arn:aws:s3:::bundt-dev-io-landing/*",
             "arn:aws:s3:::bundt-dev-io-docs",
             "arn:aws:s3:::bundt-dev-io-docs/*"
           ]
         },
         {
           "Effect": "Allow",
           "Action": "cloudfront:CreateInvalidation",
           "Resource": "*"
         }
       ]
     }
     ```
   - Name: `bundt-github-actions-deploy`

3. Copy the **Role ARN** → set as `AWS_ROLE_ARN` secret

---

## 8. prev 0.2.0 Publish

This should happen after the playground is verified working.

```bash
cd /home/nicks-dgx/dev/bundt/packages/prev

# Update version
# Edit package.json: "version": "0.2.0"

# Build
bun run build

# Dry run to verify package contents
npm publish --dry-run

# Publish
npm publish --access public

# Tag in git
git tag @bundt/prev@0.2.0
git push origin @bundt/prev@0.2.0
```

---

## 9. Verification Checklist

Run through these after everything is deployed:

```bash
# DNS resolution
dig bundt-dev.io +short           # should return CloudFront IPs
dig docs.bundt-dev.io +short      # should return CloudFront IPs
dig playground.bundt-dev.io +short # should return CloudFront IPs

# HTTPS
curl -sI https://bundt-dev.io | head -5
# HTTP/2 200, content-type: text/html

curl -sI https://docs.bundt-dev.io | head -5
# HTTP/2 200

curl -sI https://playground.bundt-dev.io | head -5
# HTTP/2 200

# Playground health
curl -s https://playground.bundt-dev.io/api/presets | head -1
# Should return JSON

# SPA routing (landing)
curl -sI https://bundt-dev.io/setup | head -3
# HTTP/2 200 (not 404 — CloudFront custom error response handles this)

# WebSocket (playground)
# Open browser DevTools → Network → WS
# Navigate to playground.bundt-dev.io
# Should see WebSocket connection to /ws
```

---

## Order of Operations (Summary)

```
1. ACM cert (must be issued before CloudFront)
     ↓
2. S3 buckets (landing + docs)
     ↓
3. CloudFront distributions (landing + docs + playground)
   ├── Landing: S3 origin + OAC + SPA error pages
   ├── Docs: S3 origin + OAC
   └── Playground: EC2 origin + cache disabled + WebSocket
     ↓
4. EC2 instance + Docker + first manual deploy
     ↓
5. Route 53 A alias records (3 records)
     ↓
6. S3 sync (upload landing + docs builds)
     ↓
7. GitHub secrets (for CI/CD automation)
     ↓
8. Verify all endpoints
     ↓
9. prev 0.2.0 publish (after playground verified)
```

---

## Notes

### Local Deploys

All deploys run from the monorepo root: `/home/nicks-dgx/dev/bundt`

#### Prerequisites

```bash
# Find your CloudFront distribution IDs (run once, save them)
aws cloudfront list-distributions \
  --query "DistributionList.Items[*].{Id:Id,Domain:Aliases.Items[0]}" \
  --output table
```

#### Deploy landing site (`bundt-dev.io`)

```bash
cd websites/landing && bun run build && cd ../..
aws s3 sync websites/landing/dist/ s3://bundt-dev-io-landing --delete
aws cloudfront create-invalidation --distribution-id LANDING_DIST_ID --paths "/*"
```

#### Deploy docs site (`docs.bundt-dev.io`)

```bash
cd websites/docs && bun run build && cd ../..
aws s3 sync websites/docs/dist/ s3://bundt-dev-io-docs --delete
aws cloudfront create-invalidation --distribution-id DOCS_DIST_ID --paths "/*"
```

#### Deploy playground (`playground.bundt-dev.io`)

The playground runs as a Docker container on EC2. Redeploy by building a new image, pushing to GHCR, then pulling on the instance.

```bash
# 1. Build and push from local machine
docker build -f websites/playground/Dockerfile -t prev-playground .
docker tag prev-playground ghcr.io/mega-blastoise/bundt/prev-playground:latest
docker push ghcr.io/mega-blastoise/bundt/prev-playground:latest

# 2. SSH into EC2 and swap the container
ssh -i ~/.ssh/your-key.pem ec2-user@ELASTIC_IP << 'EOF'
  docker pull ghcr.io/mega-blastoise/bundt/prev-playground:latest
  docker stop prev-playground && docker rm prev-playground
  docker run -d \
    --name prev-playground \
    --restart unless-stopped \
    -p 80:3000 \
    ghcr.io/mega-blastoise/bundt/prev-playground:latest
EOF
```

No CloudFront invalidation needed — the playground distribution uses `CachingDisabled`.
