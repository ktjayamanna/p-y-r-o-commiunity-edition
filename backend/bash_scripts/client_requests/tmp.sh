#!/bin/bash

# Client test script for podcast preprocessing endpoint
ENDPOINT="http://localhost:8000/preprocess-podcast-test"
TIMESTAMP=$(date +%s)

# Create request payload
JSON_PAYLOAD=$(cat <<EOF
{
  "script": "This is a test podcast script about technology innovations...",
  "voice": "21m00Tcm4TlvDq8ikWAM",
  "voice_gender": "male",
  "model_id": "eleven_multilingual_v2",
  "user_id": "test_user_$TIMESTAMP",
  "speech_rate": 90.5,
  "voice_intonation_consistency": 75,
  "emotion": "neutral"
}
EOF
)

# Send request and capture response
echo "Sending request to $ENDPOINT..."
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD" "$ENDPOINT")

# Process response
echo -e "\nServer Response:"
echo "$RESPONSE" | jq .

# Extract paths from response
OUTPUT_FILE=$(echo "$RESPONSE" | jq -r '.local_path')
METRICS_FILE=$(echo "$RESPONSE" | jq -r '.metrics_path')

# Display results
echo -e "\nGenerated files:"
echo -e "Audio output:   file://$(pwd)/$OUTPUT_FILE"
echo -e "Metrics report: file://$(pwd)/$METRICS_FILE"