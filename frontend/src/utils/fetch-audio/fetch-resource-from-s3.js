export async function fetchResourceFromS3(
  bucketName,
  objectName,
  estimatedProcessingTime = 0
) {
  try {
    const response = await fetch("/api/S3/fetchAudioFromS3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketName, objectName }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const resourceUrl = URL.createObjectURL(blob); // Create a URL for the blob

    // Wait for the estimated processing time after fetching the URL
    // to ensure the file is ready for use
    await new Promise((resolve) =>
      setTimeout(resolve, estimatedProcessingTime)
    );

    return resourceUrl; // Return the URL for further processing if needed
  } catch (error) {
    console.error("Failed to fetch resource:", error.message);
    throw new Error("Failed to fetch resource from API.");
  }
}
