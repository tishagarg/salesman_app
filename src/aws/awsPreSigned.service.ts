import AWS from 'aws-sdk';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const extractKeyFromUrl = (url:string) => {
  const urlObj = new URL(url);
  // Remove the bucket name part from the pathname
  return urlObj.pathname.substring(1); // Removes the leading '/'
};

/**
 * Generates a presigned URL for accessing an object in an S3 bucket.
 *
 * @param {string} objectKey - The key (path) of the object within the S3 bucket.
 * @param {number} [expiresIn=3600] - The expiration time in seconds for the presigned URL. Defaults to 3600 seconds (1 hour).
 * @returns {string} The presigned URL for accessing the specified object in S3.
 */
export const generatePresignedUrl = (
  objectUrl: string,
  expiresIn = 36000,
) => {
  if (
    !objectUrl ||
    typeof objectUrl !== 'string' ||
    objectUrl.trim() === ''
  ) {
    throw new Error(
      'Invalid S3 object key. It cannot be empty or undefined.',
    );
  }

  const objectKey = extractKeyFromUrl(objectUrl);

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: objectKey,
    Expires: expiresIn, // Expiration time in seconds
  };

  return s3.getSignedUrl('getObject', params);
};
