import IWindow from "./i-window";
import * as Bootstrap from 'bootstrap';
import {isEnglishSentence} from "./utils.js";

const toggleButton = document.getElementById("toggleButton") as HTMLButtonElement;
const transcripts = document.getElementById("transcripts") as HTMLDivElement;
const conversationCountInput = document.getElementById("conversationCount") as HTMLInputElement;
const apiTokenInput = document.getElementById("apiToken") as HTMLTextAreaElement ;
const systemRoleInput = document.getElementById("systemRole") as HTMLInputElement ;
const startSoundElement = document.getElementById("startSound") as HTMLAudioElement;

const DEFAULT_CONVERSATION_COUNT = 10;

const DEFAULT_SYSTEM_ROLE = "Your responses should be 30 words or less and use correct grammar.Regardless of the language inquired, please respond in English.";

declare const window:any;
declare var bootstrap: typeof Bootstrap;

let isRecording = false;
// let recognition: SpeechRecognition;

type MessageType = {
    role: string;
    content: string;
};
let transcriptList:MessageType[]=[];

type onTranscriptionReceivedCallback = (transcript:string)=>void;
const generateResponse:onTranscriptionReceivedCallback=async(transcript:string)=>{
    addUserMessage(transcript);
    const apiToken = apiTokenInput.value;
    const apiResponse = await inquireToChatGPT(createQueryMessage(),apiToken);
    processAfterResponse(apiResponse);
}


type onResponseReceivedCallback = (message:string)=>void;
const processAfterResponse:onResponseReceivedCallback=(message:string)=>{
    addAIMessage(message);
    speechMessage(message);
}

const speechMessage = (message:string) => {
    // Speak API response
    let speechUtterance = new SpeechSynthesisUtterance(message);

    speechUtterance.lang =isEnglishSentence(message) ? "en" : "ja";
    speechUtterance.onend = () => {
        // 読み上げが終了したら音声認識を再開
        startRecogntionWithUI();
    };

    let speech: SpeechSynthesis = window.speechSynthesis;
    speech.speak(speechUtterance);
}


function appendMessageToChat(role, labelContent, messageText) {
    const chatContainer = document.querySelector('.chat-container');
    const messageDiv = document.createElement('div');
    const labelSpan = document.createElement('span');
    const textSpan = document.createElement('span');

    labelSpan.textContent = labelContent;
    labelSpan.classList.add('label');

    textSpan.textContent = messageText;
    textSpan.classList.add('text');

    messageDiv.classList.add('chat-message');

    if (role === 'user') {
        messageDiv.classList.add('user-message');
        messageDiv.appendChild(labelSpan);
        messageDiv.appendChild(textSpan);
    } else if (role === 'ai') {
        messageDiv.classList.add('ai-message');
        messageDiv.appendChild(textSpan);
        messageDiv.appendChild(labelSpan);
    }

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addUserMessage(message) {
    appendMessageToChat('user', 'YOU: ', message);
    transcriptList.push({
        role:"user",
        content:message
    })
}

function addAIMessage(message) {
    appendMessageToChat('ai', ' :AI', message);
    transcriptList.push({
        role:"assistant",
        content:message
    });
}

function playAudio(audio:HTMLAudioElement,timeout:number=0){
  return new Promise(res=>{
    audio.play()
    if(timeout) {
        setTimeout(res,timeout)
    }
    else{//再生が終わったらresolveする
        audio.onended = res
    }
  })
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
async function inquireToChatGPT(messages:MessageType[],token:string){
    try {
        const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7
        })
        });


        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();
        console.log(data); // レスポンスをコンソールに表示
        if (!data?.choices?.[0]?.message?.content) {
            throw new ResponseError("Expected data structure not received from OpenAI API",data);
        }
        const content = data.choices[0].message.content;
        return content
    } catch (error) {
        if (error  instanceof ResponseError){
            console.log("received response is wrong", error.message);
            showToastMessage("received response is wrong.message="+error.message);
        }
        else{
            console.log("There was a problem with the fetch operation:", error.message);
            showToastMessage("There was a problem with the fetch operation. message="+error.message);
        }

        return ""
    }
}

function createQueryMessage(){
    const n = isNaN(parseInt(conversationCountInput.value))
        ? DEFAULT_CONVERSATION_COUNT
        : parseInt(conversationCountInput.value);

    const systemRole:MessageType = {
        "role": "system", 
        "content": systemRoleInput.value
    };

    const queryList = getLastNTranscripts(n)
    queryList.unshift(systemRole)
    console.log(queryList)
    return queryList
}

// n個前の会話までを取得する関数
function getLastNTranscripts(n) {
    return transcriptList.slice(-n);
}

const stopWhisperRecogntionWithUI=()=>{
    stopWhisperRecogntion()

    toggleButton.textContent = "Push to talk";
    toggleButton.classList.remove('btn-danger');
    toggleButton.classList.add('btn-primary');
}
const stopWhisperRecogntion=()=>{
    isRecording=false;
    mediaRecorder.stop();
}

toggleButton.addEventListener("click", async(event) => {
    if (isRecording) {
        stopWhisperRecogntionWithUI();
    } else {
        const apiToken = apiTokenInput.value;
        if (!apiToken) {
            showToastMessage("There is no API token. Please enter your API token.");
            return;
        }

        saveInputs();
        startRecogntionWithUI();
    }
});

class ResponseError extends Error {
    public response:any

    constructor(message: string,response:any) {
        super(message);
        this.name = "ResponseError";
        this.response=response;

        Object.setPrototypeOf(this, ResponseError.prototype);
  }
}

function showToastMessage(message) {
    const toastElement = document.querySelector('.toast');
    const toastBody = toastElement.querySelector('.toast-body');
    const toast = new bootstrap.Toast(toastElement);
    toastBody.textContent = message;  // ここでメッセージを設定します
    toast.show();
}

function saveInputs(){
    localStorage.setItem("apiToken",apiTokenInput.value);
    localStorage.setItem("systemRole",systemRoleInput.value);
    localStorage.setItem("conversationCount",conversationCountInput.value);
}

function loadPreviousInputs(){
    apiTokenInput.value = localStorage.getItem("apiToken") || "";
    // systemRoleInput.value = localStorage.getItem("systemRole") || DEFAULT_SYSTEM_ROLE;
    systemRoleInput.value =  DEFAULT_SYSTEM_ROLE;
    conversationCountInput.value = localStorage.getItem("conversationCount") || DEFAULT_CONVERSATION_COUNT.toString();
}

let mediaRecorder;
const startRecogntionWithUI=async()=>{
    await playAudio(startSoundElement,300); //mobile版では音声認識が始まるとサウンドが途切れてしまうため、待機する
    startWhisperRecogntion()

    toggleButton.textContent = "Finish recording";
    toggleButton.classList.remove('btn-primary');
    toggleButton.classList.add('btn-danger');
}

const startWhisperRecogntion=()=>{
    let audioChunks = [];
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                sendToWhisperAPI(audioBlob,generateResponse);
            };

            mediaRecorder.start();
            isRecording=true;
        })
        .catch(error => {
            console.error("Error accessing microphone:", error);
            throw error;
        });
}


function sendToWhisperAPI(audioBlob,callback:onTranscriptionReceivedCallback) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'openai.wav'); // この例では .wav 形式で送信します。.mp3 が必要な場合、追加の変換が必要です。
    formData.append('model', 'whisper-1');

    const apiToken = apiTokenInput.value;
    fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`// 実際のトークンに置き換えてください
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log("transcript:"+ data?.text);
        callback(data?.text);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}


document.addEventListener("DOMContentLoaded", function() {
    console.log("content loaded");
    loadPreviousInputs();
});