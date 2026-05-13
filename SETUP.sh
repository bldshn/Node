#!/bin/bash

# Phase 4 Complete Setup Guide
# Run this to set up AWS CDK locally

echo "🚀 Phase 4 Setup"
echo "═════════════════════════════════════"

# Step 1: Global CDK setup (one time)
echo ""
echo "Step 1: Install AWS CDK v2 globally"
npm install -g aws-cdk@2
cdk --version

# Step 2: Configure AWS credentials
echo ""
echo "Step 2: Configure AWS credentials"
echo "Run: aws configure"
echo "(Enter: Access Key ID, Secret Access Key, region: us-east-1, format: json)"

# Step 3: Bootstrap CDK (one time per AWS account)
echo ""
echo "Step 3: Bootstrap CDK in your AWS account"
echo "Get your account ID: aws sts get-caller-identity --query Account"
echo "Run: cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1"

# Step 4: Install CDK dependencies
echo ""
echo "Step 4: Install CDK dependencies"
cd infra/cdk
pnpm install

# Step 5: Preview and deploy
echo ""
echo "Step 5: Deploy to AWS"
echo "Preview CloudFormation: pnpm synth"
echo "See what will change: pnpm diff"
echo "Deploy: pnpm deploy"
echo "(First deploy takes ~15 minutes for RDS creation)"

# Step 6: Run migrations
echo ""
echo "Step 6: Run database migrations"
echo "After deployment, get RDS Proxy endpoint from CDK output"
echo "Run migrations: DB_HOST=<endpoint> pnpm db:migrate"

# Step 7: Deploy frontend
echo ""
echo "Step 7: Deploy frontend to Vercel"
echo "Get API URL from CDK output"
echo "Set NEXT_PUBLIC_API_URL in Vercel environment"
echo "Deploy: cd apps/frontend && vercel --prod"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure AWS credentials: aws configure"
echo "2. Bootstrap CDK: cdk bootstrap aws://ACCOUNT_ID/us-east-1"
echo "3. Deploy: cd infra/cdk && pnpm deploy"
echo "4. Run migrations: pnpm db:migrate"
echo "5. Deploy frontend: cd apps/frontend && vercel --prod"
