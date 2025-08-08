#!/bin/sh

set -e

# Default values for environment variables
BASE_URL=${BASE_URL:-"http://localhost:8080"}
VALHALLA_URL=${VALHALLA_URL:-"http://localhost:8002"}
MAPTILER_API_KEY=${MAPTILER_API_KEY:-""}
MAPTILER_URL=${MAPTILER_URL:-"https://api.maptiler.com/maps"}

echo "Starting trackoss container..."
echo "Backend API URL: $BASE_URL"
echo "Valhalla URL: $VALHALLA_URL"
echo "MapTiler URL: $MAPTILER_URL"
if [ -n "$MAPTILER_API_KEY" ]; then
    echo "MapTiler API Key: Configured"
else
    echo "MapTiler API Key: Not configured (using OSM fallback)"
fi

# Path to the configuration file
CONFIG_FILE="/usr/share/nginx/html/assets/config.json"

echo "🔧 Configuring runtime environment variables..."

# Replace placeholders in config.json with actual environment variable values
if [ -f "$CONFIG_FILE" ]; then
    # Create a temporary file for the replacement
    TEMP_FILE=$(mktemp)

    # Replace placeholders with actual values using sed
    sed "s|__BASE_URL__|$BASE_URL|g" "$CONFIG_FILE" | \
    sed "s|__VALHALLA_URL__|$VALHALLA_URL|g" | \
    sed "s|__MAPTILER_API_KEY__|$MAPTILER_API_KEY|g" | \
    sed "s|__MAPTILER_URL__|$MAPTILER_URL|g" > "$TEMP_FILE"

    # Move the temporary file back to the original location
    mv "$TEMP_FILE" "$CONFIG_FILE"

    echo "✅ Configuration file updated:"
    cat "$CONFIG_FILE"
else
    echo "⚠️  Configuration file not found: $CONFIG_FILE"
    echo "Creating default configuration..."

    # Create the assets directory if it doesn't exist
    mkdir -p "$(dirname "$CONFIG_FILE")"

    cat > "$CONFIG_FILE" << EOF
{
  "baseUrl": "$BASE_URL",
  "valhallaUrl": "$VALHALLA_URL",
  "mapTilerApiKey": "$MAPTILER_API_KEY",
  "mapTilerUrl": "$MAPTILER_URL"
}
EOF
fi

echo "🚀 Starting nginx server..."

# Execute the original command (nginx)
exec "$@"
