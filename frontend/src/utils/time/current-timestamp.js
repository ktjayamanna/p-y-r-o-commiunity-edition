// Captures the current timestamp in its raw numeric form.
export function captureCurrentTimestamp() {
  const now = new Date();
  return now.getTime(); // This returns the timestamp in milliseconds since the Unix Epoch
}

export function formatDate(timestamp) {
  let seconds;

  if (typeof timestamp === 'object' && timestamp.seconds) {
    // If it's an object with a 'seconds' property
    seconds = timestamp.seconds;
  } else if (typeof timestamp === 'string') {
    // If it's a string, try to parse it
    const match = timestamp.match(/seconds=(\d+)/);
    seconds = match ? parseInt(match[1], 10) : null;
  } else if (typeof timestamp === 'number') {
    // If it's already a number
    seconds = timestamp;
  }

  if (seconds === null || isNaN(seconds)) {
    console.error('Invalid timestamp format:', timestamp);
    return 'Invalid Date';
  }

  const date = new Date(seconds * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
}

// Formats the captured timestamp into a human-readable form, adhering to your specified format.
export function formatTimestampForDisplay() {
  const rawTimestamp = captureCurrentTimestamp(); // Get the timestamp inside the function
  const date = new Date(rawTimestamp);
  const options = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  };
  return date
    .toLocaleString("en-US", options)
    .replace(/[\/\s,:]/g, "-") // Replace slashes, spaces, commas, and colons with hyphens
    .replace(/-+/g, "-"); // Collapse multiple consecutive hyphens into one
}

// Generates a unique Pyro Order ID using the raw timestamp.
export function generatePyroOrderIdFromTimestamp() {
  const rawTimestamp = captureCurrentTimestamp(); // Get the timestamp inside the function
  // Create a numeric string from the timestamp for encoding
  const numeric = rawTimestamp.toString();
  // Simple hash to create a 7-digit number from the timestamp
  let hash = 0;
  for (let i = 0; i < numeric.length; i++) {
    hash = (hash * 10 + Number(numeric[i])) % 10000000;
  }
  return `pyro-order--${hash.toString().padStart(7, "0")}`;
}
