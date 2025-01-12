import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import multer from "multer";
import * as util from "util";
import * as fs from "fs";

import path from "path";
const __dirname = path.resolve();

//AWS Imports
import S3 from "aws-sdk/clients/s3.js";

dotenv.config();

const app = express();
const port = process.env.PORT;
const readFile = util.promisify(fs.readFile);

const s3 = new S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
  },
});

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

const handleUploadToS3 = async (file, s3FilePath) => {
  //* Uploading files to S3 Bucket
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

const handlePresignedURLGeneration = async (s3FilePath) => {
  //* Downloading by generating presigned URLs from S3 Bucket
  try {
    const url = await s3.getSignedUrlPromise("getObject", {
      Bucket: process.env.BUCKET_NAME,
      Key: s3FilePath,
      Expires: 60 * 5,
    });
    return url;
  } catch (e) {
    console.log(e);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + file.originalname);
  },
});
const upload = multer({ storage: storage });

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const s3_file_key = req.file.filename;
    const _result = await handleUploadToS3(req.file, s3_file_key);
    res
      .status(200)
      .json({ message: "file upload successful", s3_key: s3_file_key });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.post("/generate_presigned_url", async (req, res) => {
  try {
    const { filename } = req.body;
    const result = await handlePresignedURLGeneration(filename);
    console.log(result);
    res.status(200).json({ url: result });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.listen(port, () => {
  console.log(`Now listening on port ${port}`);
});

// Handling non matching request from the client
app.use((req, res, next) => {
  res.status(404).send("<h1> 404! Page not found on the server</h1>");
});

export default app;
