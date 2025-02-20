export async function generateVoiceWithElevenLabsAPI(
    script,
    modelId,
    voiceId,
    voiceIntonationConsistency
) {
    try {
        const response = await fetch(
            "/api/Elevenlabs/generate_voice_with_voice_id",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    script,
                    modelId,
                    voiceId,
                    voiceIntonationConsistency,
                }),
            }
        );

        if (!response.ok) {
            throw new Error("Network response was not ok.");
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const localHistoryItemId = response.headers.get("history-item-id");

        return { audioUrl, localHistoryItemId };
    } catch (err) {
        console.error(err);
        throw err;
    }
}
