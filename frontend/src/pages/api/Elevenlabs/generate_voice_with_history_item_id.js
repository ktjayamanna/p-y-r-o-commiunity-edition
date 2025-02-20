import axios from "axios";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { historyItemId } = req.body;

    try {
      const options = {
        method: "POST",
        url: "https://api.elevenlabs.io/v1/history/download",
        headers: {
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ history_item_ids: [historyItemId] }),
        responseType: "stream", // Ensure the response is treated as a stream
      };

      const response = await axios(options);

      // Set headers for the response to the client
      res.setHeader("Content-Type", "audio/mpeg");
      // Optional: Include any other headers you might need

      // Stream the response data directly to the client
      response.data.pipe(res);
    } catch (err) {
      console.error(err);
      // If Axios catches an error, it will be part of the err.response object
      const status = err.response ? err.response.status : 500;
      const message = err.response
        ? err.response.data
        : "Failed to fetch audio from ElevenLabs";
      res.status(status).json({ error: message });
    }
  } else {
    // Handle any non-POST requests
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
