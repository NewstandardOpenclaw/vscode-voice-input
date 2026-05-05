# Voice Input (Whisper) - VSCode Extension

音声を録音して、OpenAI Whisperで文字起こしし、カーソル位置に挿入するVSCode拡張です。

## 機能
- `Cmd+Shift+R` で録音開始/停止（トグル）
- 録音中はステータスバーに `🔴 Recording...` 表示
- 録音停止後、Whisper APIへ送信して文字起こし
- 文字起こし結果を現在のカーソル位置に挿入

## 設定
`settings.json` に以下を設定してください。

```json
{
  "voiceInput.openaiApiKey": "sk-...",
  "voiceInput.language": "ja"
}
```

- `voiceInput.openaiApiKey`: OpenAI APIキー（必須）
- `voiceInput.language`: 文字起こし言語（デフォルト `ja`）

## 開発手順
```bash
npm install
npm run compile
```

F5 で Extension Development Host を起動してテストできます。

## コマンド
- `Voice Input: Toggle Recording` (`voiceInput.toggleRecording`)

## 使用API
- Endpoint: `https://api.openai.com/v1/audio/transcriptions`
- Model: `whisper-1`

## 必要な環境
- macOS: `brew install sox`
- Linux: `sudo apt install sox`
- Windowsは現時点では未対応

## ターミナル・グローバルホットキーで使う（macOS）

VSCode外（ターミナル、Claude Code CLIなど）でも音声入力できます。

### セットアップ

```bash
# 1. voiceスクリプトをインストール
cp scripts/voice.sh /usr/local/bin/voice
chmod +x /usr/local/bin/voice

# 2. APIキー設定ファイルを作成
mkdir -p ~/.config/voice
cp scripts/voice-config.example ~/.config/voice/config
# ~/.config/voice/config を編集してAPIキーを入力

# 3. Hammerspoonをインストール（グローバルホットキー用）
brew install --cask hammerspoon
```

### Hammerspoon設定

1. Hammerspoonを起動
2. システム設定 → プライバシーとセキュリティ → アクセシビリティ → Hammerspoon をオン
3. `~/.hammerspoon/init.lua` に `scripts/hammerspoon-init.lua` の内容をコピー
4. メニューバーの🔨→「Reload Config」

### 使い方

- `Ctrl+Shift+R` → 録音開始（画面中央に「🎙️ 録音中...」表示）
- 話す
- `Ctrl+Shift+R` → 停止＆文字起こし（クリップボードに自動コピー）
- `Cmd+V` で任意の場所に貼り付け

## 注意
- 録音には `node-record-lpcm16` を使用しています。
- OS環境によっては録音コマンド（sox/arecordなど）が必要です。
