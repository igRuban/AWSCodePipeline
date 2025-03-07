#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CodePipelineStack } from '../lib/aws-codepipeline-stack';

const app = new cdk.App();
new CodePipelineStack(app, 'AwsCodepipelineStack', {
  
});