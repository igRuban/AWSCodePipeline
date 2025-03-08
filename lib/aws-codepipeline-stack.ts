import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import { CfnParameter } from 'aws-cdk-lib';

export class AwsCodepipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Declare Parameters
    const pipelineName = new CfnParameter(this, 'PipelineName', {
      type: 'String',
      description: 'The name of the pipeline',
      default: 'MyAppPipeline',
    });

    const sourceStageName = new CfnParameter(this, 'SourceStageName', {
      type: 'String',
      description: 'The name of the source stage',
      default: 'Source',
    });

    const buildStageName = new CfnParameter(this, 'BuildStageName', {
      type: 'String',
      description: 'The name of the build stage',
      default: 'Build',
    });

    const deployStageName = new CfnParameter(this, 'DeployStageName', {
      type: 'String',
      description: 'The name of the deploy stage',
      default: 'Deploy',
    });

    const buildProjectName = new CfnParameter(this, 'BuildProjectName', {
      type: 'String',
      description: 'The name of the build project',
      default: 'MyBuildProject',
    });

    const deployRoleName = new CfnParameter(this, 'DeployRoleName', {
      type: 'String',
      description: 'The name of the deploy role',
      default: 'MyDeployRole',
    });

    // Create S3 Bucket to store source files
    const sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Only for dev/test environments
    });

    // Create CodeBuild Project for the build stage
    const buildProject = new codebuild.Project(this, 'BuildProject', {
      projectName: buildProjectName.valueAsString, // Use resolved value
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo Building the project...',
              'npm install',
              'npm run build',
            ],
          },
        },
        artifacts: {
          'base-directory': 'build', // Adjust to where your build outputs go
          files: '**/*',
        },
      }),
    });

    // Create IAM Role for deploy stage
    const deployRole = new iam.Role(this, 'DeployRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
      roleName: deployRoleName.valueAsString, // Use resolved value
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
    });

    // Create CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: pipelineName.valueAsString, // Use resolved value
    });

    // Add Source Stage to Pipeline
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.S3SourceAction({
      actionName: 'Source',
      bucket: sourceBucket,
      bucketKey: 'source.zip', // Adjust as per your source code structure
      output: sourceOutput,
    });

    // Add Build Stage to Pipeline
    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // Create CodeDeploy Application and Deployment Group for the deploy stage
    const codedeployApp = new codedeploy.ServerApplication(this, 'MyCodeDeployApp', {
      applicationName: 'MyApplication',
    });

    const deploymentGroup = new codedeploy.ServerDeploymentGroup(this, 'MyDeploymentGroup', {
      deploymentGroupName: 'MyDeploymentGroupName',
      application: codedeployApp,
      deploymentConfig: codedeploy.ServerDeploymentConfig.ALL_AT_ONCE, // Choose the deployment strategy you need
      autoRollback: {
        failedDeployment: true,
      },
    });

    // Add Deploy Stage to Pipeline
    const deployAction = new codepipeline_actions.CodeDeployServerDeployAction({
      actionName: 'Deploy',
      input: buildOutput,
      deploymentGroup: deploymentGroup, // Reference to the deployment group
      role: deployRole,
    });

    // Add stages to the pipeline
    pipeline.addStage({
      stageName: sourceStageName.valueAsString, // Use resolved value
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: buildStageName.valueAsString, // Use resolved value
      actions: [buildAction],
    });

    pipeline.addStage({
      stageName: deployStageName.valueAsString, // Use resolved value
      actions: [deployAction],
    });

    // Outputs
    new cdk.CfnOutput(this, 'PipelineNameOutput', {
      value: pipeline.pipelineName,
      description: 'The name of the pipeline',
    });
  }
}
