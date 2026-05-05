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

## 注意
- 録音には `node-record-lpcm16` を使用しています。
- OS環境によっては録音コマンド（sox/arecordなど）が必要です。
