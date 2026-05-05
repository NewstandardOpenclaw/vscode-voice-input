# Voice Input (Whisper)

> **macOS専用**。Windows / Linuxは現時点で未対応。

音声を録音してOpenAI Whisperで文字起こしし、テキストとして入力できるツール。
VS Code拡張機能とmacOSグローバルホットキーの2つの形態で提供している。

## 実装の意図

Claude Code CLIやVS Codeのチャット欄など、キーボード入力が必要なあらゆる場所で音声入力を使いたいという目的で作成。
VSCode拡張単体では「エディタにフォーカスがないと動かない」という制限があるため、
Hammerspoon + シェルスクリプトによるグローバルホットキー方式を併用している。

---

## APIキーの使い分け

| 利用形態 | APIキーの設定場所 |
|----------|-----------------|
| VS Code拡張 | VS Code `settings.json` の `voiceInput.openaiApiKey` |
| ターミナル / グローバルホットキー | `~/.config/voice/config` の `OPENAI_API_KEY` |

---

## 構成

```
src/extension.ts              # VS Code拡張本体
scripts/voice.sh              # ターミナル用スクリプト（/usr/local/bin/voice にインストール）
scripts/hammerspoon-init.lua  # Hammerspoonホットキー設定
scripts/voice-config.example  # APIキー設定テンプレート
.vscode/launch.json           # Extension Development Host起動設定
```

---

## 1. VS Code拡張機能

### 機能
- エディタ内で `Cmd+Shift+R` を押すと録音開始/停止（トグル）
- 録音停止後にWhisper APIで文字起こし
- 文字起こし結果をカーソル位置に挿入 + クリップボードにもコピー
- エディタにフォーカスがない場合はクリップボードのみにコピーして通知表示

### VS Code設定
`settings.json` に追加：
```json
{
  "voiceInput.openaiApiKey": "sk-...",
  "voiceInput.language": "ja"
}
```

### 開発・動作確認

```bash
npm install
npm run compile
```

F5（または `Fn+F5`）で Extension Development Host を起動。
別のVS Codeウィンドウが開くので、エディタをクリックして `Cmd+Shift+R` を押す。

---

## 2. ターミナル・グローバルホットキー（macOS推奨）

VS Code外でも使えるシェルスクリプト方式。Claude Code CLI、ターミナル、あらゆるアプリで動作する。

### 必要なもの

```bash
brew install sox                    # 録音コマンド（rec）
brew install --cask hammerspoon     # グローバルホットキー
```

### セットアップ

```bash
# voiceスクリプトをインストール
cp scripts/voice.sh /usr/local/bin/voice
chmod +x /usr/local/bin/voice

# APIキー設定ファイルを作成
mkdir -p ~/.config/voice
cp scripts/voice-config.example ~/.config/voice/config
# ~/.config/voice/config を開いて OPENAI_API_KEY を実際の値に書き換える
```

### Hammerspoon設定

1. Hammerspoonを起動（初回はアクセシビリティ許可が必要）
   - システム設定 → プライバシーとセキュリティ → アクセシビリティ → Hammerspoon をオン
2. `~/.hammerspoon/init.lua` に `scripts/hammerspoon-init.lua` の内容をコピー
3. メニューバーの🔨→「Reload Config」

### Mac起動時に自動起動する設定

システム設定 → 一般 → ログイン項目 → 「+」→ `Hammerspoon.app` を追加

### 使い方

| 操作 | 結果 |
|------|------|
| `Ctrl+Shift+R` | 録音開始（画面中央に「🎙️ 録音中...」と2秒表示） |
| 話す | — |
| `Ctrl+Shift+R` | 録音停止 → Whisper文字起こし → GPT整形 → クリップボードにコピー → 結果を画面表示 |
| `Cmd+V` | 任意の場所に貼り付け |

### ターミナルから直接使う場合

```bash
/usr/local/bin/voice   # 1回目: 録音開始
/usr/local/bin/voice   # 2回目: 停止 + 文字起こし + クリップボードコピー
```

### GPT整形について

Whisperの文字起こし後にgpt-4o-miniで以下を自動処理する：

- **フィラー除去**：「えーと」「あの」「まあ」などの無意味な言葉を削除
- **句読点補完**：自然な位置に「。」「、」を追加
- **意味は変えない**：内容の書き換えや要約は行わない

**例：**

| | テキスト |
|---|---|
| 話した内容 | 「えーとですね、今日はあの、天気がいいですよね、まあそんな感じで」 |
| 整形なし（Whisper生） | `えーとですね、今日はあの、天気がいいですよね、まあそんな感じで` |
| 整形あり（デフォルト） | `今日は天気がいいですね。` |

### GPT整形を無効にする場合

Whisperの生テキストをそのまま使いたい場合は `~/.config/voice/config` に追加：
```bash
export VOICE_USE_GPT="false"
```

---

## トラブルシューティング

```bash
# 録音プロセスが起動しているか確認
cat /tmp/voice-recording.pid && ps aux | grep "rec -q" | grep -v grep

# 文字起こしログを確認
cat /tmp/voice-hs.log

# APIエラーの詳細を確認
cat /tmp/voice-error.log

# クリップボードの内容を確認
pbpaste

# 録音・一時ファイルをリセット（おかしくなったとき）
rm -f /tmp/voice-recording.pid /tmp/voice-recording.wav /tmp/voice-hs.log /tmp/voice-rec.log

# recコマンドが動くか単体確認
rec -r 44100 -c 1 /tmp/test.wav trim 0 3 && echo "OK"

# Hammerspoonが起動しているか確認
pgrep -x Hammerspoon && echo "起動中" || echo "未起動"
```

---

## 技術仕様

| 項目 | 内容 |
|------|------|
| 録音コマンド | `rec`（sox）, 44100Hz, モノラル, WAV |
| 文字起こしAPI | OpenAI Whisper API (`whisper-1`) |
| 文字起こし整形 | gpt-4o-miniでフィラー除去・句読点補完（`VOICE_USE_GPT=false` で無効化可能） |
| クリップボード | AppleScript経由（`osascript`） |
| ホットキー管理 | Hammerspoon（Lua） |
| APIキー保存場所 | `~/.config/voice/config`（**git管理外・コミット禁止**） |

---

## 注意

- `~/.config/voice/config` にAPIキーが含まれるため、絶対にgitにコミットしない
- Hammerspoonが起動していないとグローバルホットキーは動作しない
- `node-record-lpcm16` は環境依存あり。動かない場合は `brew install sox` を確認
