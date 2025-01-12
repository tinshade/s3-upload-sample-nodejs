import dotenv from "dotenv";
// import * as AWS from "aws-sdk";
import * as util from "util";
import * as path from "path";
import * as fs from "fs";

dotenv.config();
const readFile = util.promisify(fs.readFile);

export const testing = () => {
  console.log("testing");
};

export const handleUploadToS3 = async (s3, file, s3FilePath) => {
  try {
    const fileData = await readFile(file.path);

    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: s3FilePath,
      Body: fileData,
    };
    return new Promise((resolve, reject) => {
      s3.upload(params, {}, (err, data) => {
        if (err) {
          console.log("Erorr while uploading to S3", err);
          reject(err);
        }
        console.log("Upload successful!", data);
        resolve(data);
      });
    });
  } catch (e) {
    console.log(e);
  }
};
