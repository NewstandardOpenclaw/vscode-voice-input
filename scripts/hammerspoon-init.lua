-- Ctrl+Shift+R でvoiceスクリプトをトグル実行
-- 録音中は画面にアラートを表示し続ける（2回目のキーで消える）
local isRecording = false
local recordingAlert = nil

hs.hotkey.bind({"ctrl", "shift"}, "r", function()
  if isRecording then
    isRecording = false
    if recordingAlert then
      hs.alert.closeSpecific(recordingAlert)
      recordingAlert = nil
    end
    hs.alert.show("⏳ 文字起こし中...")
  else
    isRecording = true
    recordingAlert = hs.alert.show("🎙️ 録音中...", 99999)
  end
  os.execute("nohup /usr/local/bin/voice >> /tmp/voice-hs.log 2>&1 &")
end)
