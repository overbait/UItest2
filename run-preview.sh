#!/bin/bash
echo "Installing dependencies (if not already done)..."
npm install
echo "Building application..."
npm run build
echo "Starting preview server..."
npm run preview
