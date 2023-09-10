import IWindow from "./i-window";

console.log("start script");

const toggleButton = document.getElementById("toggleButton") as HTMLButtonElement;
const transcripts = document.getElementById("transcripts") as HTMLDivElement;
const conversationCountInput = document.getElementById("conversationCount") as HTMLInputElement;
const apiTokenInput = document.getElementById("apiToken") as HTMLTextAreaElement ;
const systemRoleInput = document.getElementById("systemRole") as HTMLInputElement ;
const startSoundElement = document.getElementById("startSound") as HTMLAudioElement;

const DEFAULT_CONVERSATION_COUNT = 10;
conversationCountInput.value = DEFAULT_CONVERSATION_COUNT.toString();

const DEFAULT_SYSTEM_ROLE = "You are the user's friend. Your responses should be 30 words or less and use correct grammar.";
systemRoleInput.value=DEFAULT_SYSTEM_ROLE;

declare const window:any

let isStarted = false;
// let recognition: SpeechRecognition;
let recognition: any;
let speech: SpeechSynthesis;
let speechUtterance: SpeechSynthesisUtterance;



type MessageType = {
    role: string;
    content: string;
};
let transcriptList:MessageType[]=[];

function startRecognition() {
    const SpeechRecognition = window.speechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.addEventListener('result', async(event) => {
        const transcript = event.results[0][0].transcript;

        // Display user input
        transcripts.innerHTML += `<div>YOU：${transcript}</div>`;

        transcriptList.push({
            role:"user",
            content:transcript
        })
        recognition.stop();

        const apiToken = apiTokenInput.value;

        const apiResponse = await inquireToChatGPT(createQueryMessage(),apiToken);

        // Display API response
        transcripts.innerHTML += `<div>AI：${apiResponse}</div>`;

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

    // recognition.addEventListener('end', () => {
    //     if (isStarted) {
    //         recognition.start();
    //     }
    // });

    recognition.start();
    startSoundElement.play();
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
            console.log(error.response);
        }
        else{
            console.log("There was a problem with the fetch operation:", error.message);
        }
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

toggleButton.addEventListener("click", () => {
    console.log("button pressed");
    if (isStarted) {
        isStarted = false;
        stopRecognition();
        toggleButton.textContent = "会話を開始する";
    } else {
        isStarted = true;
        speech = window.speechSynthesis;
        startRecognition();
        toggleButton.textContent = "会話を終了する";
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

