#!/bin/bash

echo "🚀 Claude Code GUI Electron 앱을 시작합니다..."

# 서버와 클라이언트 시작
npm run electron &
SERVER_PID=$!

echo "⏳ 서버와 클라이언트가 준비될 때까지 대기 중..."
sleep 5

# 서버와 클라이언트가 준비되었는지 확인
while ! curl -s http://localhost:7003 > /dev/null; do
    echo "클라이언트 대기 중..."
    sleep 1
done

while ! curl -s http://localhost:7001/api/health > /dev/null; do
    echo "서버 대기 중..."
    sleep 1
done

echo "✅ 서버와 클라이언트가 준비되었습니다!"
echo "🖥️  Electron 앱을 시작합니다..."

# Electron 실행
cd packages/electron && npm run dev

# 종료 시 서버도 종료
trap "kill $SERVER_PID" EXIT
wait $SERVER_PID