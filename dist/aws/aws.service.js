"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFileFromS3 = exports.uploadFileBufferToS3 = exports.uploadContractPdf = exports.uploadContractImage = exports.upload = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Ensure AWS credentials and bucket name are set
if (!process.env.AWS_ACCESS_KEY ||
    !process.env.AWS_SECRET_KEY ||
    !process.env.AWS_REGION ||
    !process.env.VISIT_AWS_S3_BUCKET_NAME ||
    !process.env.CONTRACT_AWS_BUCKET_NAME) {
    throw new Error("Missing AWS credentials in environment variables");
}
// Configure S3 client using AWS SDK v3
const s3 = new client_s3_1.S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
    region: process.env.AWS_REGION,
});
exports.upload = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
        s3: s3,
        bucket: process.env.VISIT_AWS_S3_BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const uniqueName = `${Date.now().toString()}_${path_1.default.basename(file.originalname)}`;
            cb(null, uniqueName);
        },
    }),
});
exports.uploadContractImage = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
        s3: s3,
        bucket: process.env.CONTRACT_AWS_BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const uniqueName = `${Date.now().toString()}_${path_1.default.basename(file.originalname)}`;
            cb(null, uniqueName);
        },
    }),
});
exports.uploadContractPdf = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
        s3: s3,
        bucket: process.env.CONTRACT_AWS_BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const uniqueName = `contracts/pdf/${Date.now().toString()}_${path_1.default.basename(file.originalname)}`;
            cb(null, uniqueName);
        },
    }),
    fileFilter: (req, file, cb) => {
        // Only allow PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});
const uploadFileBufferToS3 = (buffer, key) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
    };
    const command = new client_s3_1.PutObjectCommand(params);
    return yield s3.send(command);
});
exports.uploadFileBufferToS3 = uploadFileBufferToS3;
const deleteFileFromS3 = (objectUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const objectKey = extractKeyFromUrl(objectUrl);
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: objectKey,
    };
    const command = new client_s3_1.DeleteObjectCommand(params);
    yield s3.send(command);
});
exports.deleteFileFromS3 = deleteFileFromS3;
const extractKeyFromUrl = (url) => {
    const urlObj = new URL(url);
    // Remove the bucket name part from the pathname
    return urlObj.pathname.substring(1); // Removes the leading '/'
};
