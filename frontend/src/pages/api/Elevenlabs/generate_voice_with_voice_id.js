import axios from "axios";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { script, modelId, voiceId, voiceIntonationConsistency } = req.body;

    try {
      const dataPayload = {
        text: script,
        model_id: modelId,
      };

      if (
        typeof voiceIntonationConsistency !== "undefined" &&
        voiceIntonationConsistency !== null
      ) {
        dataPayload.voice_settings = {
          stability: voiceIntonationConsistency / 100,
          similarity_boost: 0.75,
        };
      }

      const options = {
        method: "post",
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_192`,
        headers: {
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY, // Keep sensitive data server-side
          "Content-Type": "application/json",
        },
        data: JSON.stringify(dataPayload),
        responseType: "stream", // This is important to handle binary data like audio files
      };

      const response = await axios(options);

      // With axios, the headers and data are accessed differently
      const localHistoryItemId = response.headers["history-item-id"];

      // Set headers for the response to the client
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("history-item-id", localHistoryItemId); // Send history item ID in response headers

      // Stream the response data directly to the client
      response.data.pipe(res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate voice" });
    }
  } else {
    // Handle any non-POST requests
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
