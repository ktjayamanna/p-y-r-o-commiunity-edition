#!/bin/bash
#Run this script right before merging a PR to main (and close it) so that the CI can run.

# Navigate to the runner directory
cd /home/kor/actions-runner

# Start the runner in the background
./run.sh &

# Store the runner's process ID
RUNNER_PID=$!

# Optionally, wait for a specific amount of time
# Sleep times could depend on how long your jobs usually run
sleep 300  # 300s = 5min

# Kill the runner process after the wait
kill $RUNNER_PID
