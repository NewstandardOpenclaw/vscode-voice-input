"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const recorder = require('node-record-lpcm16');
let isRecording = false;
let statusBarItem;
let recordingProcess;
let fileStream;
let tempFilePath;
function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '🎙️ Voice Ready';
    statusBarItem.tooltip = 'Voice Input (Whisper)';
    statusBarItem.show();
    const disposable = vscode.commands.registerCommand('voiceInput.toggleRecording', async () => {
        if (!isRecording) {
            await startRecording();
        }
        else {
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
    }
    catch (error) {
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
        await vscode.env.clipboard.writeText(transcript);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await insertAtCursor(transcript);
            statusBarItem.text = '🎙️ Voice Ready';
            vscode.window.setStatusBarMessage('Voice Input: Transcription inserted', 2500);
        }
        else {
            statusBarItem.text = '🎙️ Voice Ready';
            vscode.window.showInformationMessage(`📋 クリップボードにコピーしました: ${transcript}`);
        }
    }
    catch (error) {
        statusBarItem.text = '🎙️ Voice Ready';
        vscode.window.showErrorMessage(`Transcription failed: ${String(error)}`);
    }
    finally {
        cleanupRecording();
    }
}
async function transcribeWithWhisper(audioFilePath) {
    const config = vscode.workspace.getConfiguration('voiceInput');
    const apiKey = config.get('openaiApiKey')?.trim();
    const language = config.get('language', 'ja');
    if (!apiKey) {
        throw new Error('voiceInput.openaiApiKey is not set. Please configure it in settings.json');
    }
    const form = new form_data_1.default();
    form.append('file', fs.createReadStream(audioFilePath));
    form.append('model', 'whisper-1');
    form.append('language', language);
    const response = await axios_1.default.post('https://api.openai.com/v1/audio/transcriptions', form, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            ...form.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    });
    return response.data?.text ?? '';
}
async function insertAtCursor(text) {
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
    }
    catch {
        // ignore
    }
    fileStream = undefined;
    recordingProcess = undefined;
    if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
            fs.unlinkSync(tempFilePath);
        }
        catch {
            // ignore
        }
    }
    tempFilePath = undefined;
}
function deactivate() {
    if (isRecording && recordingProcess) {
        recordingProcess.stop();
    }
    cleanupRecording();
}
//# sourceMappingURL=extension.js.map