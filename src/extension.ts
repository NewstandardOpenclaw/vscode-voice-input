import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const recorder = require('node-record-lpcm16');

let isRecording = false;
let statusBarItem: vscode.StatusBarItem;
let recordingProcess: any;
let fileStream: fs.WriteStream | undefined;
let tempFilePath: string | undefined;

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '🎙️ Voice Ready';
  statusBarItem.tooltip = 'Voice Input (Whisper)';
  statusBarItem.show();

  const disposable = vscode.commands.registerCommand('voiceInput.toggleRecording', async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      await stopRecordingAndTranscribe();
    }
  });

  context.subscriptions.push(disposable, statusBarItem);
}

async function startRecording() {
  try {
    tempFilePath = path.join(os.tmpdir(), `vscode-voice-${Date.now()}.wav`);
    fileStream = fs.createWriteStream(tempFilePath, { encoding: 'binary' });

    recordingProcess = recorder.record({
      sampleRate: 16000,
      channels: 1,
      audioType: 'wav'
    });

    recordingProcess.stream().pipe(fileStream);
    isRecording = true;
    statusBarItem.text = '🔴 Recording...';
    vscode.window.setStatusBarMessage('Voice Input: Recording started', 2000);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start recording: ${String(error)}`);
    cleanupRecording();
  }
}

async function stopRecordingAndTranscribe() {
  try {
    if (!recordingProcess || !tempFilePath) {
      return;
    }

    recordingProcess.stop();
    fileStream?.end();

    isRecording = false;
    statusBarItem.text = '⏳ Transcribing...';

    // Ensure file is flushed
    await new Promise((resolve) => setTimeout(resolve, 300));

    const transcript = await transcribeWithWhisper(tempFilePath);
    await insertAtCursor(transcript);

    statusBarItem.text = '🎙️ Voice Ready';
    vscode.window.setStatusBarMessage('Voice Input: Transcription inserted', 2500);
  } catch (error) {
    statusBarItem.text = '🎙️ Voice Ready';
    vscode.window.showErrorMessage(`Transcription failed: ${String(error)}`);
  } finally {
    cleanupRecording();
  }
}

async function transcribeWithWhisper(audioFilePath: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('voiceInput');
  const apiKey = config.get<string>('openaiApiKey')?.trim();
  const language = config.get<string>('language', 'ja');

  if (!apiKey) {
    throw new Error('voiceInput.openaiApiKey is not set. Please configure it in settings.json');
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(audioFilePath));
  form.append('model', 'whisper-1');
  form.append('language', language);

  const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders()
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  return response.data?.text ?? '';
}

async function insertAtCursor(text: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error('No active text editor found');
  }

  await editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, text);
  });
}

function cleanupRecording() {
  isRecording = false;
  try {
    fileStream?.close();
  } catch {
    // ignore
  }
  fileStream = undefined;
  recordingProcess = undefined;

  if (tempFilePath && fs.existsSync(tempFilePath)) {
    try {
      fs.unlinkSync(tempFilePath);
    } catch {
      // ignore
    }
  }
  tempFilePath = undefined;
}

export function deactivate() {
  if (isRecording && recordingProcess) {
    recordingProcess.stop();
  }
  cleanupRecording();
}
