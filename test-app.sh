#!/bin/bash
# 서버와 클라이언트를 백그라운드에서 실행
cd /Users/seonggukpark/claude-code-gui

echo "Starting server..."
npm run dev:server > server.log 2>&1 &
SERVER_PID=$!

echo "Starting client..."
npm run dev:client > client.log 2>&1 &
CLIENT_PID=$!

echo "Waiting for services to start..."
sleep 5

echo "Starting Electron..."
cd packages/electron
npm start &
ELECTRON_PID=$!

echo "Services started:"
echo "- Server PID: $SERVER_PID"
echo "- Client PID: $CLIENT_PID"
echo "- Electron PID: $ELECTRON_PID"
echo ""
echo "To stop all services, run: kill $SERVER_PID $CLIENT_PID $ELECTRON_PID"
echo "Logs are in server.log and client.log"

# Keep script running
wait