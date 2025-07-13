#!/bin/sh

set -e

# Default values for environment variables
MAP_TILE_PROXY_BASE_URL=${MAP_TILE_PROXY_BASE_URL:-"/api/map-proxy"}
VALHALLA_URL=${VALHALLA_URL:-"/api/valhalla"}

echo "Starting trackoss container..."
echo "Map Tile Proxy Base URL: $MAP_TILE_PROXY_BASE_URL"
echo "Valhalla URL: $VALHALLA_URL"

# Find all JavaScript files in the nginx html directory
JS_FILES=$(find /usr/share/nginx/html -name "*.js" -type f)

echo "🔧 Configuring environment variables in application files..."

# Replace placeholders with actual environment variable values
for file in $JS_FILES; do
    if [ -f "$file" ]; then
        # Use sed to replace placeholders with environment variable values
        # We need to escape special characters in URLs for sed
        MAP_TILE_PROXY_BASE_URL_ESCAPED=$(echo "$MAP_TILE_PROXY_BASE_URL" | sed 's/[[\.*^$()+?{|]/\\&/g')
        VALHALLA_URL_ESCAPED=$(echo "$VALHALLA_URL" | sed 's/[[\.*^$()+?{|]/\\&/g')

        sed -i "s|__MAP_TILE_PROXY_BASE_URL__|$MAP_TILE_PROXY_BASE_URL_ESCAPED|g" "$file"
        sed -i "s|__VALHALLA_URL__|$VALHALLA_URL_ESCAPED|g" "$file"
    fi
done

echo "Environment configuration complete!"
echo "Starting nginx server..."

# Execute the original command (nginx)
exec "$@"
