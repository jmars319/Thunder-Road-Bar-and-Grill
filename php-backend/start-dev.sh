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
echo "🌐 Starting server on http://localhost:5001"
echo "   API Base URL: http://localhost:5001/api"
echo ""
echo "📝 Test endpoints:"
echo "   curl http://localhost:5001/api/health"
echo "   curl http://localhost:5001/api/menu"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start PHP development server with router
php -S localhost:5001 router.php
