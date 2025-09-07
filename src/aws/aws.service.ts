import {
  DeleteObjectCommand,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
// Ensure AWS credentials and bucket name are set
if (
  !process.env.AWS_ACCESS_KEY ||
  !process.env.AWS_SECRET_KEY ||
  !process.env.AWS_REGION ||
  !process.env.VISIT_AWS_S3_BUCKET_NAME ||
  !process.env.CONTRACT_AWS_BUCKET_NAME
) {
  throw new Error("Missing AWS credentials in environment variables");
}

// Configure S3 client using AWS SDK v3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
  region: process.env.AWS_REGION,
});

export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.VISIT_AWS_S3_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueName = `${Date.now().toString()}_${path.basename(
        file.originalname
      )}`;
      cb(null, uniqueName);
    },
  }),
});
export const uploadContractImage = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.CONTRACT_AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueName = `${Date.now().toString()}_${path.basename(
        file.originalname
      )}`;
      cb(null, uniqueName);
    },
  }),
});

export const uploadContractPdf = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.CONTRACT_AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueName = `contracts/pdf/${Date.now().toString()}_${path.basename(
        file.originalname
      )}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});
export const uploadFileBufferToS3 = async (
  buffer: Buffer,
  key: string
): Promise<PutObjectCommandOutput> => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Body: buffer,
  };

  const command = new PutObjectCommand(params);
  return await s3.send(command);
};

export const deleteFileFromS3 = async (objectUrl: string): Promise<void> => {
  const objectKey = extractKeyFromUrl(objectUrl);

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: objectKey,
  };

  const command = new DeleteObjectCommand(params);
  await s3.send(command);
};

const extractKeyFromUrl = (url: string) => {
  const urlObj = new URL(url);
  // Remove the bucket name part from the pathname
  return urlObj.pathname.substring(1); // Removes the leading '/'
};
