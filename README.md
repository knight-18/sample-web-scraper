
# WEB-SCRAPER-APPLICATION-ON-AWS

An application which demonstrates web scraping solution on AWS using Serverless services to schedule scraping jobs or run on-demand.

## Application Features
- Run scraping jobs on an on-demand basis
- Schedule scraping jobs 
- Output of the scraped data can be stores in Amazon S3 Bucket
- Notify stakeholders in case of application failure through email using Amazon SNS

## AWS Services Used in solution
- AWS Lambda
- Amazon Elastic Container Service
- Amazon S3
- Amazon Eventbridge
- Amazon SNS
- Amazon Cloudwatch

## Deployment

To deploy this project 

- [Deploy a Cloudformation stack](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacks.html) using the [cloudformation template](./web-scraper-cf.yaml)
- While creating the stack it takes the following inputs:
    - SubnetAIdParam: Enter subnet ID from your VPC to be used to run Amazon ECS tasks
    - SubnetBIdParam: Enter subnet ID of another subnet from your VPC to be used to run Amazon ECS tasks
    - EmailId: Enter the email id of the used to be notified in case of application failure
- After successful deployment of the stack you can use the following AWS Lambda functions to run scraper jobs as per requirements:
    - run-scraper: Use this lambda function to run scraper on ad-hoc basis
    - schedule-scraper: Use this lambda function to schedule scraper to run at regular intervals
