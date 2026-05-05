local isRecording = false

-- ログファイルを監視して文字起こし完了を検知
local watcher = hs.pathwatcher.new("/tmp/voice-hs.log", function()
  local f = io.open("/tmp/voice-hs.log", "r")
  if not f then return end
  local content = f:read("*a")
  f:close()

  local lastLine = content:match(".*\n(.+)$") or content
  if lastLine:find("✅") then
    local text = lastLine:gsub("✅ ", "")
    if #text > 40 then
      text = text:sub(1, 40) .. "..."
    end
    hs.alert.show("✅ " .. text, 4)
  end
end):start()

hs.hotkey.bind({"ctrl", "shift"}, "r", function()
  if isRecording then
    isRecording = false
    hs.alert.show("⏳ 文字起こし中...", 3)
  else
    isRecording = true
    hs.alert.show("🎙️ 録音中...", 2)
  end
  os.execute("nohup /usr/local/bin/voice >> /tmp/voice-hs.log 2>&1 &")
end)
