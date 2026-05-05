#!/bin/bash
set -euo pipefail

CONFIG_FILE="$HOME/.config/voice/config"
[[ -f "$CONFIG_FILE" ]] && source "$CONFIG_FILE"
API_KEY="${OPENAI_API_KEY:-}"
LANGUAGE="${VOICE_LANGUAGE:-ja}"
USE_GPT="${VOICE_USE_GPT:-true}"   # falseにするとWhisper生テキストをそのまま使用
PID_FILE="/tmp/voice-recording.pid"
TMPFILE="/tmp/voice-recording.wav"

if [[ -z "$API_KEY" ]]; then
  osascript -e 'display notification "OPENAI_API_KEY が設定されていません" with title "Voice Input" sound name "Basso"'
  exit 1
fi

if [[ -f "$PID_FILE" ]]; then
  # 録音中 → 停止して文字起こし
  REC_PID=$(cat "$PID_FILE")
  rm -f "$PID_FILE"
  kill "$REC_PID" 2>/dev/null || true
  sleep 0.5

  echo "⏳ 文字起こし中..."
  osascript -e 'display notification "文字起こし中..." with title "Voice Input"' 2>/dev/null || true

  if [[ ! -f "$TMPFILE" ]] || [[ ! -s "$TMPFILE" ]]; then
    echo "❌ 録音ファイルが空です（マイク権限を確認してください）"
    exit 1
  fi

  RESPONSE=$(curl -s -w "\n%{http_code}" https://api.openai.com/v1/audio/transcriptions \
    -H "Authorization: Bearer $API_KEY" \
    -F file="@$TMPFILE" \
    -F model="whisper-1" \
    -F language="$LANGUAGE")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [[ "$HTTP_CODE" != "200" ]]; then
    echo "❌ Whisper APIエラー (HTTP $HTTP_CODE)" >> /tmp/voice-hs.log
    echo "$BODY" >> /tmp/voice-error.log
    osascript -e "display notification \"APIエラー (HTTP $HTTP_CODE)\" with title \"Voice Input ❌\" sound name \"Basso\"" 2>/dev/null || true
    rm -f "$TMPFILE"
    exit 1
  fi

  RAW_TEXT=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('text',''))" 2>/dev/null || echo "")

  if [[ -z "$RAW_TEXT" ]]; then
    echo "❌ 文字起こし失敗（詳細: /tmp/voice-error.log）"
    echo "$BODY" >> /tmp/voice-error.log
    rm -f "$TMPFILE"
    exit 1
  fi

  TEXT="$RAW_TEXT"

  # GPT整形（VOICE_USE_GPT=false で無効化可能）
  if [[ "$USE_GPT" == "true" ]]; then
    REFINE_RESPONSE=$(curl -s https://api.openai.com/v1/chat/completions \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"gpt-4o-mini\",
        \"messages\": [{
          \"role\": \"system\",
          \"content\": \"音声認識テキストを自然な文章に整形してください。ルール: (1)えーと・あの・まあ等のフィラーを除去 (2)適切な句読点を補完 (3)意味は一切変えない (4)整形後のテキストのみ出力\"
        },{
          \"role\": \"user\",
          \"content\": \"$RAW_TEXT\"
        }]
      }")

    GPT_TEXT=$(echo "$REFINE_RESPONSE" | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  print(data['choices'][0]['message']['content'].strip())
except:
  pass
" 2>/dev/null || echo "")

    if [[ -n "$GPT_TEXT" ]]; then
      TEXT="$GPT_TEXT"
    fi
  fi

  osascript -e "set the clipboard to \"$TEXT\""
  echo "✅ $TEXT"
  osascript -e "display notification \"$TEXT\" with title \"Voice Input ✅\" sound name \"Glass\"" 2>/dev/null || true
  rm -f "$TMPFILE"

else
  # 録音開始（バックグラウンドに完全に切り離す）
  nohup /usr/local/bin/rec -q -r 44100 -c 1 "$TMPFILE" </dev/null >>/tmp/voice-rec.log 2>&1 &
  echo $! > "$PID_FILE"
  disown
  echo "🎙️ 録音中... もう一度 voice を実行すると停止"
  osascript -e 'display notification "録音中... もう一度押すと停止" with title "🎙️ Voice Input"' 2>/dev/null || true
fi
