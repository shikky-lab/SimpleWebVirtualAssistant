import IWindow from "./i-window";
import * as Bootstrap from 'bootstrap';


console.log("start script");

const toggleButton = document.getElementById("toggleButton") as HTMLButtonElement;
const transcripts = document.getElementById("transcripts") as HTMLDivElement;
const conversationCountInput = document.getElementById("conversationCount") as HTMLInputElement;
const apiTokenInput = document.getElementById("apiToken") as HTMLTextAreaElement ;
const systemRoleInput = document.getElementById("systemRole") as HTMLInputElement ;
const startSoundElement = document.getElementById("startSound") as HTMLAudioElement;

const DEFAULT_CONVERSATION_COUNT = 10;

const DEFAULT_SYSTEM_ROLE = "You are the user's friend. Your responses should be 30 words or less and use correct grammar.";

declare const window:any;
declare var bootstrap: typeof Bootstrap;

let isStarted = false;
// let recognition: SpeechRecognition;
let recognition: any=null;
let speech: SpeechSynthesis;
let speechUtterance: SpeechSynthesisUtterance;



type MessageType = {
    role: string;
    content: string;
};
let transcriptList:MessageType[]=[];

function setupRecognitionIfNeeded() {
    if (recognition) {
        return;
    }
    const SpeechRecognition = window.speechRecognition || window.webkitSpeechRecognition;

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.addEventListener('result', async(event) => {
        const transcript = event.results[0][0].transcript;

        addUserMessage(transcript);

        transcriptList.push({
            role:"user",
            content:transcript
        })
        recognition.stop();

        const apiToken = apiTokenInput.value;

        const apiResponse = await inquireToChatGPT(createQueryMessage(),apiToken);

        addAIMessage(apiResponse);

        // トランスクリプトの内容を配列に追加
        transcriptList.push({
            role:"assistant",
            content:apiResponse
        });
        
        // Speak API response
        speechUtterance = new SpeechSynthesisUtterance(apiResponse);
        speechUtterance.lang = "en-US";
        speechUtterance.onend = () => {
            // 読み上げが終了したら音声認識を再開
            startRecognition();
        };

        speech.speak(speechUtterance);
    });

    recognition.addEventListener("error", (event) => {
        if (event.error === 'no-speech') {
           //こうやって書けばno-speechだけ検出できるが、ひとまずはどのエラーでも会話を止める。
        }
        console.error(`音声認識エラーが発生しました: ${event.error}`);
        stopConversation();
    });
    recognition.addEventListener('end', () => {
        // if (isStarted) {
        //     recognition.start();
        // }
    });
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
}

function addAIMessage(message) {
    appendMessageToChat('ai', ' :AI', message);
}

function playAudio(audio){
  return new Promise(res=>{
    audio.play()
    audio.onended = res
  })
}


async function startRecognition() {
    setupRecognitionIfNeeded();
    console.log("sound start");
    await playAudio(startSoundElement);
    console.log("sound finished");
    recognition.start();
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

        stopConversation();

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

function stopRecognition() {
    recognition.stop();
    recognition = null!;
}

async function startConversation(){

    isStarted = true;
    speech = window.speechSynthesis;
    startRecognition();
    toggleButton.textContent = "会話を終了する";
    toggleButton.classList.remove('btn-primary');
    toggleButton.classList.add('btn-danger');
}

function stopConversation(){
    isStarted = false;
    stopRecognition();
    toggleButton.textContent = "会話を開始する";
    toggleButton.classList.remove('btn-danger');
    toggleButton.classList.add('btn-primary');
}

toggleButton.addEventListener("click", (event) => {
    if (isStarted) {
        stopConversation();
    } else {
        saveInputs();

        const apiToken = apiTokenInput.value;
        if (!apiToken) {
            showToastMessage("There is no API token. Please enter your API token.");
            return;
        }
        startConversation();
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

document.addEventListener("DOMContentLoaded", function() {
    console.log("content loaded");
    loadPreviousInputs();
    setupRecognitionIfNeeded();
});