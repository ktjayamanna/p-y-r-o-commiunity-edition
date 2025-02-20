#!/bin/bash

# Check if a file path is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path-to-service-account-json>"
    exit 1
fi

# File path to the Google service account JSON
FILE_PATH=$1

# Encode the file in base64, remove newlines, and write it to secret_oneliner.txt
base64 "$FILE_PATH" | tr -d '\n' > secret_oneliner.txt

echo "Encoded string saved to secret_oneliner.txt"
