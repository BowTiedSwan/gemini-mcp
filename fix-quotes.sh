#!/bin/bash

# Fix broken string quotes in TypeScript files

find src -name "*.ts" -type f | while read file; do
  # Fix contenteditable selector
  sed -i '' 's/contenteditable="true"/contenteditable=\\"true\\"/g' "$file"
  # Fix any other broken quotes
  sed -i '' 's/div\[contenteditable=\\"true\\"\]/div[contenteditable=\\"true\\"]/g' "$file"
done

echo "Fixed quote issues"
