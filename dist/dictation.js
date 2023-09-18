var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { playAudio } from "./utils.js";
export class Dictation {
    constructor(apiTokenElement, toggleButton, abortButton, startSoundElement, onFinishedDictationCallback) {
        this.isRecording = false;
        this.isAborted = false;
        this.onClick = () => {
            if (this.isRecording) {
                this.stopWhisperRecogntionWithUI();
            }
            else {
                this.startRecogntionWithUI();
            }
        };
        this.startRecogntionWithUI = () => __awaiter(this, void 0, void 0, function* () {
            yield playAudio(this.startSoundElement, 300); //mobile版では音声認識が始まるとサウンドが途切れてしまうため、待機する
            this.startWhisperRecogntion();
            this.toggleButton.textContent = "Finish recording";
            this.toggleButton.classList.remove('btn-primary');
            this.toggleButton.classList.add('btn-danger');
            this.abortButton.disabled = false;
        });
        this.startWhisperRecogntion = () => {
            let audioChunks = [];
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                this.mediaRecorder = new MediaRecorder(stream);
                this.mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                this.mediaRecorder.onstop = () => {
                    if (this.isAborted) {
                        this.isAborted = false;
                        console.log("aborted dictation");
                        return;
                    }
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    this.sendToWhisperAPI(audioBlob, this.onFinishedDictationCallback);
                };
                this.mediaRecorder.start();
                this.isRecording = true;
            })
                .catch(error => {
                console.error("Error accessing microphone:", error);
                throw error;
            });
        };
        this.sendToWhisperAPI = (audioBlob, callback) => {
            const formData = new FormData();
            formData.append('file', audioBlob, 'openai.wav'); // この例では .wav 形式で送信します。.mp3 が必要な場合、追加の変換が必要です。
            formData.append('model', 'whisper-1');
            const apiToken = this.apiTokenInput.value;
            fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`
                },
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                console.log("transcript:" + (data === null || data === void 0 ? void 0 : data.text));
                callback(data === null || data === void 0 ? void 0 : data.text);
            })
                .catch(error => {
                console.error('Error:', error);
            });
        };
        this.stopWhisperRecogntionWithUI = () => {
            this.stopWhisperRecogntion();
            this.toggleButton.textContent = "Push to talk";
            this.toggleButton.classList.remove('btn-danger');
            this.toggleButton.classList.add('btn-primary');
            this.abortButton.disabled = true;
        };
        this.stopWhisperRecogntion = () => {
            this.isRecording = false;
            this.mediaRecorder.stop();
        };
        this.abortDictation = () => {
            if (!this.isRecording) {
                return;
            }
            this.isAborted = true;
            this.stopWhisperRecogntionWithUI();
        };
        this.onFinishedDictationCallback = onFinishedDictationCallback;
        this.toggleButton = toggleButton;
        this.abortButton = abortButton;
        this.startSoundElement = startSoundElement;
        this.apiTokenInput = apiTokenElement;
    }
}
