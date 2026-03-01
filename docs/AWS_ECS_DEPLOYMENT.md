# Deploying CompileX Labs to AWS ECS (Fargate)

> **Estimated time:** 45–60 minutes  
> **AWS services used:** ECR, ECS Fargate, ALB, ACM, Secrets Manager, MongoDB Atlas (external)

---

## Prerequisites

- AWS account with admin or sufficient IAM permissions
- AWS CLI v2 installed and configured (`aws configure`)
- Docker installed locally
- MongoDB Atlas cluster (free tier works) — **we do NOT use AWS DocumentDB** to keep costs low
- Domain name (optional but recommended for HTTPS)

### Install AWS CLI (if needed)

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
aws configure        # Enter: Access Key ID, Secret, Region, Output format
```

---

## Step 1 — Create ECR Repositories

ECR (Elastic Container Registry) is where your Docker images live.

```bash
# Set your region and account ID
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create repositories for backend and frontend
aws ecr create-repository --repository-name compilex-backend --region $AWS_REGION
aws ecr create-repository --repository-name compilex-frontend --region $AWS_REGION

echo "Backend ECR: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compilex-backend"
echo "Frontend ECR: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compilex-frontend"
```

---

## Step 2 — Build and Push Docker Images

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# ── Backend ──────────────────────────────────────────
cd backend

docker build -t compilex-backend .

docker tag compilex-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compilex-backend:latest

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compilex-backend:latest

cd ..

# ── Frontend ─────────────────────────────────────────
cd frontend

docker build -t compilex-frontend .

docker tag compilex-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compilex-frontend:latest

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compilex-frontend:latest

cd ..
```

> **Tip:** Each time you update your code, run the build + push commands again, then force a new ECS deployment (Step 7).

---

## Step 3 — Store Secrets in AWS Secrets Manager

Never put secrets in environment variables directly — use Secrets Manager.

```bash
# Create a single JSON secret with all backend environment variables
aws secretsmanager create-secret \
  --name compilex/backend \
  --region $AWS_REGION \
  --secret-string '{
    "MONGO_URI": "mongodb+srv://user:pass@cluster.mongodb.net/compilex",
    "JWT_SECRET": "your_super_secret_jwt_key_here",
    "GEMINI_API_KEY": "AIzaSy...",
    "ENCRYPT_SECRET": "your_fernet_key_here=",
    "FLASK_ENV": "production"
  }'
```

Note the ARN that is printed — you will need it in the task definition (Step 5).

```
arn:aws:secretsmanager:us-east-1:123456789012:secret:compilex/backend-XXXXXX
```

---

## Step 4 — Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name compilex-cluster \
  --region $AWS_REGION \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE_SPOT,weight=4 \
    capacityProvider=FARGATE,weight=1

echo "Cluster created: compilex-cluster"
```

---

## Step 5 — Create Task Definitions

### 5a — Backend Task Definition

Save this as `/tmp/backend-task.json` (replace placeholders):

```json
{
  "family": "compilex-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "compilex-backend",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/compilex-backend:latest",
      "portMappings": [
        { "containerPort": 5000, "protocol": "tcp" }
      ],
      "secrets": [
        { "name": "MONGO_URI",      "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:compilex/backend-XXXXX:MONGO_URI::" },
        { "name": "JWT_SECRET",     "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:compilex/backend-XXXXX:JWT_SECRET::" },
        { "name": "GEMINI_API_KEY", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:compilex/backend-XXXXX:GEMINI_API_KEY::" },
        { "name": "ENCRYPT_SECRET", "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:compilex/backend-XXXXX:ENCRYPT_SECRET::" },
        { "name": "FLASK_ENV",      "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:compilex/backend-XXXXX:FLASK_ENV::" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/compilex-backend",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ]
}
```

Register it:

```bash
# Create CloudWatch log group first
aws logs create-log-group --log-group-name /ecs/compilex-backend --region $AWS_REGION
aws logs create-log-group --log-group-name /ecs/compilex-frontend --region $AWS_REGION

# Register the task definition (fill ACCOUNT_ID and REGION in the JSON first)
aws ecs register-task-definition \
  --cli-input-json file:///tmp/backend-task.json \
  --region $AWS_REGION
```

### 5b — Frontend Task Definition

Save as `/tmp/frontend-task.json`:

```json
{
  "family": "compilex-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "compilex-frontend",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/compilex-frontend:latest",
      "portMappings": [
        { "containerPort": 80, "protocol": "tcp" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/compilex-frontend",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

```bash
aws ecs register-task-definition \
  --cli-input-json file:///tmp/frontend-task.json \
  --region $AWS_REGION
```

---

## Step 6 — Set Up Application Load Balancer (ALB)

### 6a — Create ALB and Target Groups

```bash
# Get your default VPC and public subnets
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)

SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" \
  --query 'Subnets[*].SubnetId' --output text --region $AWS_REGION | tr '\t' ',')

# Create security group for ALB
ALB_SG=$(aws ec2 create-security-group \
  --group-name compilex-alb-sg \
  --description "CompileX ALB Security Group" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $AWS_REGION

# Create the ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name compilex-alb \
  --subnets $(echo $SUBNET_IDS | tr ',' ' ') \
  --security-groups $ALB_SG \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

echo "ALB ARN: $ALB_ARN"

# Create target group for BACKEND
BACKEND_TG=$(aws elbv2 create-target-group \
  --name compilex-backend-tg \
  --protocol HTTP --port 5000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# Create target group for FRONTEND
FRONTEND_TG=$(aws elbv2 create-target-group \
  --name compilex-frontend-tg \
  --protocol HTTP --port 80 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

echo "Backend TG: $BACKEND_TG"
echo "Frontend TG: $FRONTEND_TG"
```

### 6b — Create Listener Rules

```bash
# Default listener → frontend
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG \
  --region $AWS_REGION \
  --query 'Listeners[0].ListenerArn' --output text)

# /api/* → backend
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$BACKEND_TG \
  --region $AWS_REGION

echo "Listener ARN: $LISTENER_ARN"
```

---

## Step 7 — Create ECS Services

### 7a — Security group for ECS tasks

```bash
ECS_SG=$(aws ec2 create-security-group \
  --group-name compilex-ecs-sg \
  --description "CompileX ECS Tasks" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' --output text)

# Allow ALB to reach the tasks
aws ec2 authorize-security-group-ingress --group-id $ECS_SG \
  --protocol tcp --port 5000 --source-group $ALB_SG --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $ECS_SG \
  --protocol tcp --port 80 --source-group $ALB_SG --region $AWS_REGION
# Allow tasks to reach the internet (outbound)
aws ec2 authorize-security-group-egress --group-id $ECS_SG \
  --protocol -1 --cidr 0.0.0.0/0 --region $AWS_REGION 2>/dev/null || true
```

### 7b — Deploy backend service

```bash
aws ecs create-service \
  --cluster compilex-cluster \
  --service-name compilex-backend \
  --task-definition compilex-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$BACKEND_TG,containerName=compilex-backend,containerPort=5000" \
  --region $AWS_REGION
```

### 7c — Deploy frontend service

```bash
aws ecs create-service \
  --cluster compilex-cluster \
  --service-name compilex-frontend \
  --task-definition compilex-frontend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$FRONTEND_TG,containerName=compilex-frontend,containerPort=80" \
  --region $AWS_REGION
```

---

## Step 8 — Get Your App URL

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names compilex-alb \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' --output text)

echo "Your app is live at: http://$ALB_DNS"
echo "API health check:    http://$ALB_DNS/api/health"
```

> It takes **2–3 minutes** for Fargate tasks to start. Refresh until you see the app.

---

## Step 9 — Add HTTPS with ACM (Optional but Recommended)

### 9a — Request a certificate

```bash
# You must own the domain
aws acm request-certificate \
  --domain-name compilex.yourdomain.com \
  --validation-method DNS \
  --region $AWS_REGION
```

Go to **AWS Console → ACM → Certificates** and follow the DNS validation steps (add the CNAME records to your DNS provider).

### 9b — Add HTTPS listener

```bash
CERT_ARN=arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT-ID

# HTTPS listener (port 443)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG \
  --region $AWS_REGION

# Redirect HTTP → HTTPS
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' \
  --region $AWS_REGION
```

Then point your domain's CNAME to the ALB DNS name.

---

## Step 10 — Updating the App

Every time you push new code:

```bash
# 1. Rebuild and push the image
cd backend
docker build -t compilex-backend .
docker tag compilex-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compilex-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/compilex-backend:latest

# 2. Force a new deployment (ECS pulls the latest image)
aws ecs update-service \
  --cluster compilex-cluster \
  --service compilex-backend \
  --force-new-deployment \
  --region $AWS_REGION
```

---

## Estimated Monthly AWS Cost

| Service | Spec | Est. Cost/month |
|---|---|---|
| ECS Fargate (backend) | 0.5 vCPU / 1GB × 730h | ~$15 |
| ECS Fargate (frontend) | 0.25 vCPU / 0.5GB × 730h | ~$7 |
| ALB | 1 LCU avg | ~$20 |
| ECR storage | 2 images ~500MB | ~$0.50 |
| CloudWatch logs | 1 GB/month | ~$0.50 |
| **Total (without domain)** | | **~$43/month** |

> 💡 Use **FARGATE_SPOT** to reduce compute costs by up to 70%.

---

## Troubleshooting

### Tasks stopping immediately
```bash
aws ecs describe-tasks \
  --cluster compilex-cluster \
  --tasks $(aws ecs list-tasks --cluster compilex-cluster --service compilex-backend --query 'taskArns[0]' --output text) \
  --region $AWS_REGION \
  --query 'tasks[0].stoppedReason'
```

### View logs
```bash
aws logs tail /ecs/compilex-backend --follow --region $AWS_REGION
```

### Health check failing
- Make sure `/api/health` returns HTTP 200
- Check ECS security group allows inbound port 5000 from the ALB security group
- Give tasks 60–90 seconds to start before checking health

### MongoDB connection refused
- Your MongoDB Atlas cluster must have **"Allow access from anywhere"** (0.0.0.0/0) or the specific Fargate task NAT gateway IP whitelisted in Atlas → Network Access

---

## IAM Role Setup (One-Time)

If `ecsTaskExecutionRole` doesn't exist:

```bash
# Create the role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

# Attach the managed policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```
