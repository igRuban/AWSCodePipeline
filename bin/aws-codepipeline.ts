import * as cdk from 'aws-cdk-lib';
import { MyPipelineStack } from '../lib/aws-codepipeline-stack';

const app = new cdk.App();
new MyPipelineStack(app, 'AwsCodepipelineStack', {
  pipelineName: 'MyAppPipeline',         // Name of the pipeline
  sourceStageName: 'Source',             // Name of the source stage
  buildStageName: 'Build',               // Name of the build stage
  deployStageName: 'Deploy',             // Name of the deploy stage
  buildProjectName: 'MyBuildProject',    // Name of the build project
  deployRoleName: 'MyDeployRole',        // Name of the deployment role
  githubOwner: 'igRuban',                // GitHub owner (your username or organization)
  githubRepo: 'AWSCodePipeline',         // GitHub repository name
  githubBranch: 'main',                  // GitHub branch name
  githubSecretName: 'last-time',         // The name of the secret in Secrets Manager containing your GitHub OAuth token
  env: { region: 'us-east-1' }           // AWS region
});
