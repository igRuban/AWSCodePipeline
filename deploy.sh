#!/bin/bash

set -e  # Exit immediately if a command fails

echo "🚀 Starting AWS CDK Deployment..."

# make the script executable every time it runs
chmod +x "$0" 

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run CDK synth
echo "🔄 Running CDK synth..."
cdk synth

# Deploy CDK stack without manual approval
echo "🚀 Deploying CDK stack..."
cdk deploy --require-approval never

echo "✅ Deployment Completed Successfully!"
