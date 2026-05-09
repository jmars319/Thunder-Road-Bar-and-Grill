#!/bin/bash
# Thunder Road PHP Backend - Development Server Startup Script

echo "🚀 Starting Thunder Road PHP Backend Development Server..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your database credentials."
    echo ""
fi

# Check PHP version
PHP_VERSION=$(php -v | head -n 1)
echo "📦 PHP Version: $PHP_VERSION"
echo ""

# Check if MySQL is running (optional)
if command -v mysql &> /dev/null; then
    if mysql -u root -e "SELECT 1" &> /dev/null; then
        echo "✅ MySQL is running"
    else
        echo "⚠️  MySQL may not be running. Start with: brew services start mysql"
    fi
else
    echo "ℹ️  MySQL command not found (might still be installed)"
fi

echo ""
echo "🌐 Starting server on http://localhost:3304"
echo "   API Base URL: http://localhost:3304/api"
echo ""
echo "📝 Test endpoints:"
echo "   curl http://localhost:3304/api/health"
echo "   curl http://localhost:3304/api/menu"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start PHP development server with router and higher upload limits
php -d upload_max_filesize=16M -d post_max_size=32M -S localhost:3304 router.php
