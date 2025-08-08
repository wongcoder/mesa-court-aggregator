#!/bin/bash

# Quick log checker for Mesa Court Aggregator

echo "🔍 Mesa Court Aggregator - Log Viewer"
echo "====================================="

# Check if container is running
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Container is not running"
    echo "Start with: docker compose up -d"
    exit 1
fi

echo "📊 Container Status:"
docker compose ps

echo ""
echo "🔧 Supervisord Process Status:"
docker exec mesa-court-aggregator supervisorctl status

echo ""
echo "📋 Recent Application Logs (last 20 lines):"
echo "============================================"
docker compose logs --tail=20

echo ""
echo "🔄 To follow logs live, run:"
echo "  docker compose logs -f"
echo ""
echo "🎯 To view specific process logs:"
echo "  docker exec mesa-court-aggregator supervisorctl tail -f nodejs"
echo "  docker exec mesa-court-aggregator supervisorctl tail -f cloudflared"