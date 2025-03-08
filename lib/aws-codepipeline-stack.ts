import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { CfnParameter } from 'aws-cdk-lib';

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

    // Declare the parameters in the CDK stack
    const pipelineName = new CfnParameter(this, 'PipelineName', {
      type: 'String',
      description: 'The name of the pipeline',
      default: 'MyAppPipeline',  // You can also use `props.pipelineName` if it's passed
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
      projectName: buildProjectName.valueAsString,
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
      roleName: deployRoleName.valueAsString,
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
      pipelineName: pipelineName.valueAsString,
      role: deployRole, // Assign the created deploy role to the pipeline
      stages: [
        {
          stageName: sourceStageName.valueAsString,
          actions: [sourceAction],
        },
        {
          stageName: buildStageName.valueAsString,
          actions: [buildAction],
        },
        {
          stageName: deployStageName.valueAsString,
          actions: [deployAction],
        },
      ],
    });
  }
}
