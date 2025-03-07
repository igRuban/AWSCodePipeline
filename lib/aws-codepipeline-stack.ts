import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class CodePipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Fetch GitHub Token from AWS Secrets Manager
        const githubToken = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubToken', 'last-time');

        // Define Artifacts
        const sourceArtifact = new codepipeline.Artifact();
        const buildArtifact = new codepipeline.Artifact();

        // CodeBuild Project
        const buildProject = new codebuild.PipelineProject(this, 'BuildProject');

        // Define CodePipeline
        const pipeline = new codepipeline.Pipeline(this, 'MyFirstPipeline');

        // Source Stage (GitHub without Webhook)
        const sourceStage = pipeline.addStage({ stageName: 'Source' });

        // First Action: GitHub Source
        sourceStage.addAction(new codepipeline_actions.GitHubSourceAction({
            actionName: 'CheckOut',
            owner: 'igRuban', // Your GitHub username
            repo: 'AWSCodePipeline', // Your GitHub repo name
            branch: 'master',
            oauthToken: githubToken.secretValue, // Use GitHub token from Secrets Manager
            output: sourceArtifact,
            trigger: codepipeline_actions.GitHubTrigger.NONE, // Disables Webhook
        }));

        // Second Action: Another GitHub Source (or any other source)
        sourceStage.addAction(new codepipeline_actions.GitHubSourceAction({
            actionName: 'Compile',
            owner: 'anotherOwner', // Another GitHub username (or different repo)
            repo: 'AnotherRepo', // Another GitHub repo name
            branch: 'main',
            oauthToken: githubToken.secretValue, // Use GitHub token from Secrets Manager
            output: new codepipeline.Artifact('secondarySourceArtifact'),
            trigger: codepipeline_actions.GitHubTrigger.NONE, // Disables Webhook
        }));

        // Build Stage (CodeBuild)
        const buildStage = pipeline.addStage({ stageName: 'Build' });
        buildStage.addAction(new codepipeline_actions.CodeBuildAction({
            actionName: 'CodeBuild',
            project: buildProject,
            input: sourceArtifact,
            outputs: [buildArtifact],
        }));

        // Deploy Stage
        const deployStage = pipeline.addStage({ stageName: 'Deploy' });
        deployStage.addAction(new codepipeline_actions.CodeBuildAction({
            actionName: 'CodeBuild_Deploy',
            project: buildProject, // You can replace this with a separate CodeBuild project for deployment
            input: buildArtifact,
        }));
    }
}
