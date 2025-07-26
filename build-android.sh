#!/bin/bash

# Build the web app
echo "Building web app..."
npm run build

# Copy web assets to Android
echo "Copying web assets to Android..."
npx cap copy android

# Update Android project
echo "Updating Android project..."
npx cap update android

# Open Android Studio
echo "Opening Android Studio..."
npx cap open android

echo "Build process completed!" 