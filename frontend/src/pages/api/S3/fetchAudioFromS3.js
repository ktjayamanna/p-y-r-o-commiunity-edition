// pages/api/fetchAudio.js
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { generatePyroOrderIdFromTimestamp } from "@/utils/time/current-timestamp";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { bucketName, objectName } = req.body;

  // Create an S3 client (server-side)
  const s3Client = new S3Client({
    region: "us-east-2",
    credentials: {
      accessKeyId: process.env.MIN_PYRO_USER_AWS_ACCESS_KEY, // Access the AWS access key ID from environment variables
      secretAccessKey: process.env.MIN_PYRO_USER_AWS_SECRET_KEY, // Access the AWS secret access key from environment variables
    },
  });

  try {
    // Create a command to get the object from S3
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectName,
    });

    // Fetch the object from S3
    const s3Response = await s3Client.send(command);

    // Check if the response has a body stream
    if (!s3Response.Body) {
      throw new Error("S3 response does not contain a body stream");
    }

    console.log(
      `Successfully fetched object ${objectName} from bucket ${bucketName}`
    );

    // Set headers for the response to the client
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${generatePyroOrderIdFromTimestamp()}.mp3"`
    );

    // Stream the response data directly to the client
    s3Response.Body.pipe(res);

    // Log when the streaming is finished
    s3Response.Body.on("end", () => {
      console.log(
        `Streaming of ${objectName} to client completed successfully`
      );
    });

    // Handle stream errors
    s3Response.Body.on("error", (streamError) => {
      console.error(`Error during streaming ${objectName}:`, streamError);
      res.status(500).json({
        message: "Error during streaming",
        error: streamError.message,
      });
    });
  } catch (error) {
    console.error(
      `Error fetching object ${objectName} from bucket ${bucketName}:`,
      error
    );
    return res.status(500).json({
      message: `Failed to fetch audio ${objectName} from S3`,
      error: error.message,
    });
  }
}
