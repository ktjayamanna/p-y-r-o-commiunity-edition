#!/bin/bash

# Create the components directory
mkdir -p src/components

# Navigate to the components directory
cd src/components

# Create the necessary component files
touch DashboardLayout.js YourAds.js SharedWithMe.js Notifications.js CreateAdForm.js

# Create the styles directory if it doesn't already exist
mkdir -p ../styles

# Create the global CSS file
touch ../styles/globals.css

# Print a success message
echo "Components and styles files created successfully in src/components and src/styles."
