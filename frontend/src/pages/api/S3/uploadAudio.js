// pages/api/uploadAudio.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Extract the file and metadata from the request
  const { file, bucketName, objectName } = req.body;

  // Create an S3 client (server-side)
  const s3Client = new S3Client({
    region: "us-east-2",
    credentials: {
      accessKeyId: process.env.MIN_PYRO_USER_AWS_ACCESS_KEY,
      secretAccessKey: process.env.MIN_PYRO_USER_AWS_SECRET_KEY,
    },
  });

  try {
    // Convert base64-encoded file back to binary for upload
    const buffer = Buffer.from(file, "base64");

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectName,
      Body: buffer,
      ContentType: "audio/mpeg",
    });

    await s3Client.send(command);

    // Return a confirmation response
    return res.status(200).json({ message: "File uploaded successfully" });
  } catch (error) {
    console.error("Error uploading audio to S3:", error);
    return res.status(500).json({ message: "Failed to upload audio" });
  }
}
