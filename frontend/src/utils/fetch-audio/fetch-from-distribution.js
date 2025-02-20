export async function fetchAudioFromPyroBackendDistribution(
  pyroHistoryItemId,
  estimatedProcessingTime = 60000,
  maxRetries = 3
) {
  const bucketName = "workingdir--storage";
  const objectName = `primary--distribution/${pyroHistoryItemId}`;
  const retryInterval = 15000; // Interval between retries if needed

  // Wait for the estimated processing time before sending the first request
  await new Promise((resolve) => setTimeout(resolve, estimatedProcessingTime));

  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const response = await fetch("/api/S3/fetchAudioFromS3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketName: bucketName,
          objectName: objectName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audio");
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob); // Create a URL for the blob

      return audioUrl; // Return the URL for further processing if needed
    } catch (error) {
      console.error(`Attempt #${attempts + 1} failed:`, error.message);
      attempts++;

      if (attempts >= maxRetries) {
        throw new Error(
          `Failed to fetch audio URL from API after ${maxRetries} attempts.`
        );
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }
}

export async function fetchAudioFromElevenLabs(historyItemId) {
  try {
    const response = await fetch(
      "/api/Elevenlabs/generate_voice_with_history_item_id",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ historyItemId }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch audio");
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob); // Create a URL for the blob

    return audioUrl; // Return the URL for further processing if needed
  } catch (error) {
    console.error("Error fetching audio:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}
