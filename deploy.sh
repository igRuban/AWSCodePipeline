#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Function to validate AWS CLI credentials
validate_aws() {
    echo "Validating AWS credentials..."
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo "AWS CLI is not configured correctly. Please run 'aws configure'."
        exit 1
    fi
}

# Function to check if the CDK stack exists
check_stack_exists() {
    echo "Checking if the stack $STACK_NAME exists..."
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$STACK_STATUS" == "NOT_FOUND" ]]; then
        echo "Stack $STACK_NAME does not exist. Deploying now..."
        deploy_cdk_stack
    else
        echo "Stack $STACK_NAME already exists with status: $STACK_STATUS"
    fi
}

# Function to deploy the CDK stack
deploy_cdk_stack() {
    echo "Deploying CDK stack: $STACK_NAME..."
    cdk deploy $STACK_NAME \
        --require-approval never \
        --verbose \
        --progress events \
        --parameters PipelineName=$PIPELINE_NAME \
        --parameters SourceStageName=$SOURCE_STAGE_NAME \
        --parameters BuildStageName=$BUILD_STAGE_NAME \
        --parameters DeployStageName=$DEPLOY_STAGE_NAME \
        --parameters BuildProjectName=$BUILD_PROJECT_NAME \
        --parameters DeployRoleName=$DEPLOY_ROLE_NAME \
        --outputs-file cdk-outputs.json \
        --profile $AWS_PROFILE \
        --tags "Project=MyPipeline" "Owner=Ruban" \
        --json \
        --ci \
        --app "npx ts-node --prefer-ts-exts bin/aws-codepipeline.ts"  # Add the --app flag here
    echo "CDK Pipeline deployment completed successfully!"
}

# Define variables
GIT_REPO_URL="https://github.com/igRuban/AWSCodePipeline.git"  # Replace with your actual repo URL
CDK_APP_DIR="cdk-pipeline-app"  # Change if needed
STACK_NAME="MyPipelineStack"  # Replace with your actual stack name
AWS_PROFILE="default"  # Change if using a different AWS profile

# Pipeline Parameters
PIPELINE_NAME="MyCodePipeline"
SOURCE_STAGE_NAME="Source"
BUILD_STAGE_NAME="Build"
DEPLOY_STAGE_NAME="Deploy"
BUILD_PROJECT_NAME="MyCodeBuildProject"
DEPLOY_ROLE_NAME="CodeDeployRole"

# CDK App Entry Point (Path to your entry file, e.g., bin/my-pipeline.ts)
CDK_APP_ENTRY_POINT="bin/my-pipeline.ts"

# Validate AWS credentials
validate_aws

# Fetch AWS Account ID and Region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
AWS_REGION=$(aws configure get region)

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"

# Clone the CDK application repository
if [ -d "$CDK_APP_DIR" ]; then
    echo "CDK pipeline directory already exists. Pulling latest changes..."
    cd "$CDK_APP_DIR" && git pull origin main
else
    echo "Cloning CDK pipeline application..."
    git clone "$GIT_REPO_URL" "$CDK_APP_DIR"
    cd "$CDK_APP_DIR"
fi

# Install dependencies (if required)
if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Bootstrap CDK (only needed for first-time deployment)
echo "Bootstrapping AWS CDK..."
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION --profile $AWS_PROFILE

# Check if stack exists, if not deploy it
check_stack_exists
