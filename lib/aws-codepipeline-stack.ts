import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CodePipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // S3 Bucket for artifacts
        const artifactBucket = new s3.Bucket(this, 'PipelineArtifactBucket');

        // Source Artifact
        const sourceArtifact = new codepipeline.Artifact();
        const buildArtifact = new codepipeline.Artifact();

        // CodeBuild Project
        const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: ['npm install']
                    },
                    build: {
                        commands: ['npm run build']
                    }
                },
                artifacts: {
                    'files': ['**/*']
                }
            }),
        });

        // IAM Role for CodePipeline
        const pipelineRole = new iam.Role(this, 'PipelineRole', {
            assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
            ],
        });

        // CodePipeline Definition
        const pipeline = new codepipeline.Pipeline(this, 'MyPipeline', {
            pipelineName: 'MyCodePipeline',
            artifactBucket: artifactBucket,
            role: pipelineRole
        });

        // Source Stage (GitHub)
        const sourceStage = pipeline.addStage({ stageName: 'Source' });
        sourceStage.addAction(new codepipeline_actions.GitHubSourceAction({
            actionName: 'GitHub_Source',
            owner: 'your-github-username',
            repo: 'your-repository',
            branch: 'main',
            oauthToken: cdk.SecretValue.secretsManager('github-token'),
            output: sourceArtifact,
        }));

        // Deploy Stage (CodeBuild)
        const deployStage = pipeline.addStage({ stageName: 'Deploy' });
        deployStage.addAction(new codepipeline_actions.CodeBuildAction({
            actionName: 'CodeBuild',
            project: buildProject,
            input: sourceArtifact,
            outputs: [buildArtifact],
        }));
    }
}