import { playAudio } from "./utils.js";

export type onTranscriptionReceivedCallback = (transcript: string) => void;

export class Dictation {
  private mediaStream: MediaStream;
  private mediaRecorder: MediaRecorder;
  private readonly onFinishedDictationCallback: onTranscriptionReceivedCallback;
  private isRecording: boolean = false;
  private isAborted: boolean = false;

  private readonly toggleButton: HTMLButtonElement;
  private readonly abortButton: HTMLButtonElement;
  private readonly startSoundElement: HTMLAudioElement;
  private readonly apiTokenInput: HTMLInputElement;

  constructor(
    apiTokenElement: HTMLInputElement,
    toggleButton: HTMLButtonElement,
    abortButton: HTMLButtonElement,
    startSoundElement: HTMLAudioElement,
    onFinishedDictationCallback: onTranscriptionReceivedCallback,
  ) {
    this.onFinishedDictationCallback = onFinishedDictationCallback;
    this.toggleButton = toggleButton;
    this.abortButton = abortButton;
    this.startSoundElement = startSoundElement;
    this.apiTokenInput = apiTokenElement;
  }

  onClick = async () => {
    if (this.isRecording) {
      this.stopWhisperRecogntionWithUI();
    } else {
      await this.startRecogntionWithUI();
    }
  };

  startRecogntionWithUI = async () => {
    await playAudio(this.startSoundElement, 300); //mobile版では音声認識が始まるとサウンドが途切れてしまうため、待機する
    await this.startWhisperRecogntion();

    this.toggleButton.textContent = "Finish recording";
    this.toggleButton.classList.remove("btn-primary");
    this.toggleButton.classList.add("btn-danger");

    this.abortButton.disabled = false;
  };

  startWhisperRecogntion = async () => {
    let audioChunks = [];
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      this.mediaRecorder.onstop = () => {
        if (this.isAborted) {
          this.isAborted = false;
          console.log("aborted dictation");
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        this.sendToWhisperAPI(audioBlob, this.onFinishedDictationCallback);
      };
      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  };

  sendToWhisperAPI = (audioBlob, callback: onTranscriptionReceivedCallback) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "openai.wav"); // この例では .wav 形式で送信します。.mp3 が必要な場合、追加の変換が必要です。
    formData.append("model", "whisper-1");

    const apiToken = this.apiTokenInput.value;
    fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("transcript:" + data?.text);
        callback(data?.text);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  stopWhisperRecogntionWithUI = () => {
    this.stopWhisperRecogntion();

    this.toggleButton.textContent = "Push to talk";
    this.toggleButton.classList.remove("btn-danger");
    this.toggleButton.classList.add("btn-primary");

    this.abortButton.disabled = true;
  };

  stopWhisperRecogntion = () => {
    this.isRecording = false;
    this.mediaRecorder.stop();
    this.mediaStream.getTracks().forEach((track) => track.stop());
    console.log("recoding stopped");
  };

  abortDictation = () => {
    if (!this.isRecording) {
      return;
    }

    this.isAborted = true;
    this.stopWhisperRecogntionWithUI();
  };
}
