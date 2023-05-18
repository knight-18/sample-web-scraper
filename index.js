// Import Dependencies
const puppeteer = require("puppeteer")
const ObjectsToCsv = require("objects-to-csv");
const moment = require('moment')
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk')
const fs = require('fs')
const config = require("./config.json")
require('dotenv').config();

// Getting inputs from environment variables or default configuration

const ENTRY_URL = process.env.ENTRY_URL || config.SCRAPER.ENTRY_URL;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || config.AWS.SNS_TOPIC_ARN
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || config.AWS.S3_BUCKET_NAME

console.log("Entry URL: ", ENTRY_URL)
console.log("SNS Topic ARN: ", SNS_TOPIC_ARN)
console.log("S3 Bucket Name: ", S3_BUCKET_NAME )

/**
 * Summary. Function to generate csv file.
 *
 * Description. Function takes data and filename as arguments to generate a csv file from passed data.
 *
 * @param {type=Object}   csvData          Object having the data to be written to csv file.
 * @param {type=String}   filename         Name of the csv file.
 *
 * @return {type=String} Returns name of the csv file.
 */
const generateCsv = async (csvData, filename) => {
    const csv = new ObjectsToCsv(csvData);
    if (!filename) {
        filename = `${uuidv4()}.csv`
    }
    await csv.toDisk(`./data/${filename}`);
    return filename
};

/**
 * Summary. Function to publish notification to SNS Topic.
 *
 * Description. Function takes text as in input argument to be published to a SNS topic.
 *
 * @param {type=String}   text          Text to be published to SNS Topic.
 * @param {type=String}   topicARN      ARN of the SNS topic.
 *
 * @return {type=Boolean} Returns true for successful execution and false in case of any error.
 */
const publishToSnsTopic = async (text, topicARN = SNS_TOPIC_ARN) => {
    try {
        const SNS = new AWS.SNS()
        let messageParams = {
            Message: text,
            TopicArn: topicARN
        }
        await SNS.publish(messageParams).promise()
    } catch (error) {
        console.log("Failed to publish message to SNS Topic: ", error)
        return false
    }
    return true
}

/**
 * Summary. Function to extract tweets from web page.
 *
 * Description. Function makes use of class names to extract tweets and returns an array containing strings of tweets.
 *
 *
 * @return {type=Array} Returns an array containing strings of tweets.
 */

const browserScript = () => {
    let scrapedData = {}
    try {
        let title = document.getElementsByTagName('h1')[0].innerText
        scrapedData.title = title

        let countryHeadingArray = document.getElementsByTagName('h3')
        let countryNameArray = new Array()
        for (let country of countryHeadingArray) {
            countryNameArray.push(country.innerText)
        }
        scrapedData.countryNames = countryNameArray
        return scrapedData;
    } catch (error) {
        console.log("ERROR: ", error);
    }
};

/**
 * Summary. Function to upload locally stored files to Amazon S3 Bucket.
 *
 * Description. Uploads the file to an Amazon S3 Bucket.
 *
 * @param {type=String}   key               Key to be used for the object uploaded to Amazon S3 Bucket.
 * @param {type=String}   fileLocation      Location of the file stored locally.
 * @param {type=String}   bucketName        Name of the Amazon S3 Bucket to which files need to be uploaded.
 * 
 * 
 * @return {type=Boolean} Returns true for successful execution and false in case of any error.
 */


const uploadToS3 = async (key, fileLocation, bucketName = S3_BUCKET_NAME) => {
    try {
        const S3 = new AWS.S3()
        const fileContent = fs.readFileSync(fileLocation)
        const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: fileContent
        }
        await S3.upload(uploadParams).promise()
    } catch (error) {
        console.log("Error in uploading file to S3: ", error)
        return false
    }
    return true
}

/**
 * Summary. Function to run scraper.
 *
 * Description. Intiates the scraper to extract data and generate csv file which is uploaded to Amazon S3 Bucket.
 *
 * 
 * @return {type=Boolean} Returns true for successful execution and false in case of any error.
 */


const scraper = async () => {
    try {
        console.log("Launching Browser")

        var browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome',
            headless: true,
            "args": ["--disable-gpu",
                "--disable-dev-shm-usage",
                "--disable-setuid-sandbox",
                "--no-sandbox",]
        });

        let page = await browser.newPage()
        console.log("Opening: ", ENTRY_URL)
        await page.goto(ENTRY_URL, {
            waitUntil: 'networkidle0',

        })
        let scrapedData = await page.evaluate(browserScript)

        console.log("Scraped Data: ", scrapedData)

        await browser.close()

        let csvData = [];
        scrapedData.countryNames.forEach((countryName) => {
            csvData.push({ Country: countryName });
        });

        let csvFilename = await generateCsv(csvData);
        let currentTimestamp = Date.now()
        let date = moment(currentTimestamp).format('YYYY/MM/DD')

        let fileKey = `raw/${date}/${csvFilename}`
        let csvFileLocation = `./data/${csvFilename}`
        console.log({ fileKey }, { csvFileLocation })
        await uploadToS3(fileKey, csvFileLocation)
    } catch (error) {
        console.log(error)
        await publishToSnsTopic(`Job Failed: ${JSON.stringify(error)}`)
        await browser.close()
        return false
    }
    return true
}

scraper()