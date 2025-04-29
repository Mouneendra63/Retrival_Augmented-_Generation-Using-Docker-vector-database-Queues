import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(fileStream: any, filename: string, mimetype: string) {
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: filename,
    Body: fileStream,
    ContentType: mimetype,
  };

  const command = new PutObjectCommand(uploadParams);
  await s3.send(command);

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
}