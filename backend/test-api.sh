#!/bin/bash
# Test script for PHP Backend API

API_BASE="http://localhost:5001/api"

echo "🧪 Testing Thunder Road PHP Backend API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
echo "   GET $API_BASE/health"
HEALTH=$(curl -s "$API_BASE/health")
if echo "$HEALTH" | grep -q "OK"; then
    echo "   ✅ Health check passed"
    echo "   Response: $HEALTH"
else
    echo "   ❌ Health check failed"
    echo "   Response: $HEALTH"
fi
echo ""

# Test 2: Menu Endpoint
echo "2️⃣  Testing Menu Endpoint..."
echo "   GET $API_BASE/menu"
MENU=$(curl -s "$API_BASE/menu")
if echo "$MENU" | grep -q "\["; then
    ITEM_COUNT=$(echo "$MENU" | grep -o "\"id\"" | wc -l)
    echo "   ✅ Menu endpoint working"
    echo "   Found $ITEM_COUNT items in response"
else
    echo "   ⚠️  Menu returned: $MENU"
    echo "   (This is normal if database is not set up yet)"
fi
echo ""

# Test 3: Login Endpoint (should fail without credentials)
echo "3️⃣  Testing Login Endpoint..."
echo "   POST $API_BASE/login"
LOGIN=$(curl -s -X POST "$API_BASE/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}')
if echo "$LOGIN" | grep -q "credentials"; then
    echo "   ✅ Login endpoint responding correctly"
    echo "   Response: $LOGIN"
else
    echo "   ⚠️  Unexpected response: $LOGIN"
fi
echo ""

# Test 4: CORS Headers
echo "4️⃣  Testing CORS Headers..."
CORS=$(curl -s -I -X OPTIONS "$API_BASE/menu" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET")
if echo "$CORS" | grep -q "Access-Control-Allow-Origin"; then
    echo "   ✅ CORS headers present"
    echo "$CORS" | grep "Access-Control"
else
    echo "   ⚠️  CORS headers not found"
fi
echo ""

# Test 5: Dev Admin Auth
echo "5️⃣  Testing Dev Admin Header Auth..."
ADMIN=$(curl -s "$API_BASE/menu/admin" \
    -H "X-Admin-Auth: admin")
if echo "$ADMIN" | grep -q "\["; then
    echo "   ✅ Dev admin auth working"
else
    echo "   ⚠️  Dev admin auth response: $ADMIN"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Testing complete!"
echo ""
echo "Next steps:"
echo "  1. Set up your database connection in .env"
echo "  2. Import database schema from /database/schema.sql"
echo "  3. Test with your frontend: npm start (in frontend folder)"
echo ""
