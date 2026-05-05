local isRecording = false

-- UTF-8文字数で切り詰める
local function utf8sub(s, maxChars)
  local count = 0
  local i = 1
  while i <= #s and count < maxChars do
    local byte = s:byte(i)
    if byte < 128 then i = i + 1
    elseif byte < 224 then i = i + 2
    elseif byte < 240 then i = i + 3
    else i = i + 4 end
    count = count + 1
  end
  return s:sub(1, i - 1)
end

-- ログファイルを監視して文字起こし完了を検知
local watcher = hs.pathwatcher.new("/tmp/voice-hs.log", function()
  local f = io.open("/tmp/voice-hs.log", "r")
  if not f then return end
  local content = f:read("*a")
  f:close()

  local lastLine = ""
  for line in content:gmatch("[^\n]+") do
    if line ~= "" then lastLine = line end
  end
  if lastLine:find("\xe2\x9c\x85") then  -- ✅
    local text = lastLine:gsub("\xe2\x9c\x85 ", "")
    -- 20文字ごとに改行、最大3行（60文字）
    local wrapped = ""
    local chars = {}
    local i = 1
    while i <= #text do
      local byte = text:byte(i)
      local charLen
      if byte < 128 then charLen = 1
      elseif byte < 224 then charLen = 2
      elseif byte < 240 then charLen = 3
      else charLen = 4 end
      table.insert(chars, text:sub(i, i + charLen - 1))
      i = i + charLen
    end
    local total = #chars
    local maxChars = 60
    for idx, ch in ipairs(chars) do
      if idx > maxChars then
        wrapped = wrapped .. "..."
        break
      end
      wrapped = wrapped .. ch
      if idx % 20 == 0 and idx < total and idx < maxChars then
        wrapped = wrapped .. "\n"
      end
    end
    hs.alert.show("\xe2\x9c\x85 " .. wrapped, 5)
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
