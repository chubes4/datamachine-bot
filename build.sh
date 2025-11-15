#!/bin/bash

echo "Building Data Machine Bot..."

# Clean previous build
rm -rf build/
mkdir -p build/temp

# Copy files to temp directory
echo "Copying files..."
cp -r src build/temp/
cp package.json build/temp/
cp .env.example build/temp/

# Create tar.gz
echo "Creating tar.gz archive..."
tar -czf build/datamachine-bot.tar.gz -C build/temp .

# Create zip
echo "Creating zip archive..."
cd build/temp && zip -rq ../datamachine-bot.zip . && cd ../..

# Cleanup temp directory
rm -rf build/temp

echo ""
echo "Build complete!"
echo "  - build/datamachine-bot.tar.gz"
echo "  - build/datamachine-bot.zip"
echo ""
echo "To deploy (tar.gz):"
echo "  tar -xzf datamachine-bot.tar.gz"
echo ""
echo "To deploy (zip):"
echo "  unzip datamachine-bot.zip"
