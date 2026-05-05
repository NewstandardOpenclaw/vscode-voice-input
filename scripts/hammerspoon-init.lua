-- Ctrl+Shift+R でvoiceスクリプトをトグル実行
local isRecording = false

hs.hotkey.bind({"ctrl", "shift"}, "r", function()
  if isRecording then
    isRecording = false
    hs.alert.show("⏳ 文字起こし中...")
  else
    isRecording = true
    hs.alert.show("🎙️ 録音中...")
  end
  os.execute("nohup /usr/local/bin/voice >> /tmp/voice-hs.log 2>&1 &")
end)
