import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

interface MyPipelineStackProps extends cdk.StackProps {
  pipelineName: string;
  sourceStageName: string;
  buildStageName: string;
  deployStageName: string;
  buildProjectName: string;
  deployRoleName: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubSecretName: string;
}

export class MyPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyPipelineStackProps) {
    super(scope, id, props);

    // Fetch GitHub OAuth token from Secrets Manager
    const githubOAuthToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      'GitHubOAuthToken',
      props.githubSecretName
    );

    // Define the source stage (GitHub)
    const sourceOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: props.githubOwner,
      repo: props.githubRepo,
      branch: props.githubBranch,
      oauthToken: githubOAuthToken.secretValue,
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.NONE, // Skip webhook registration to avoid errors
    });

    // Define the build project (CodeBuild)
    const buildProject = new codebuild.Project(this, 'BuildProject', {
      projectName: props.buildProjectName,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo Building the project...',
              // Your build commands here
            ],
          },
        },
      }),
    });

    // Define the build stage
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceOutput,
    });

    // Create a single IAM role with AdministratorAccess attached
    const deployRole = new iam.Role(this, 'DeployRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
      roleName: props.deployRoleName,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'), // Attach AdministratorAccess policy
      ],
    });

    // Define the deploy stage (could be any service, e.g., Lambda, ECS, etc.)
    const deployAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'Deploy',
    });

    // Create the pipeline
    new codepipeline.Pipeline(this, 'MyPipeline', {
      pipelineName: props.pipelineName,
      role: deployRole, // Assign the created deploy role to the pipeline
      stages: [
        {
          stageName: props.sourceStageName,
          actions: [sourceAction],
        },
        {
          stageName: props.buildStageName,
          actions: [buildAction],
        },
        {
          stageName: props.deployStageName,
          actions: [deployAction],
        },
      ],
    });
  }
}
