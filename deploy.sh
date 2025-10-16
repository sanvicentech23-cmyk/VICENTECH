#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment process..."

# Install PHP dependencies
echo "Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

# Install Node dependencies
echo "Installing Node dependencies..."
npm ci

# Build frontend assets
echo "Building frontend assets..."
npm run build

# Generate application key if not set
echo "Generating application key..."
php artisan key:generate --force

# Clear and cache configuration
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force

# Create storage symlink
echo "Creating storage symlink..."
php artisan storage:link

echo "Deployment completed successfully!"
