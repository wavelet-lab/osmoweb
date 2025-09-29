#!/bin/bash

# Remove node_modules directories
find . -type d -name "node_modules" -prune -exec rm -rf '{}' +

# Remove common distributive/build directories
find . -type d -name "dist" -prune -exec rm -rf '{}' +
find . -type d -name "coverage" -prune -exec rm -rf '{}' +

# Remove lock files
find . -type f -name "package-lock.json" -prune -exec rm -f '{}' +

echo "Project cleaned."
