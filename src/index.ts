import IWindow from "./i-window";

console.log("start script");

const toggleButton = document.getElementById("toggleButton") as HTMLButtonElement;
const transcripts = document.getElementById("transcripts") as HTMLDivElement;
const conversationCountInput = document.getElementById("conversationCount") as HTMLInputElement;
const apiTokenInput = document.getElementById("apiToken") as HTMLInputElement ;
const systemRoleInput = document.getElementById("systemRole") as HTMLInputElement ;

const DEFAULT_CONVERSATION_COUNT = 10;
conversationCountInput.value = DEFAULT_CONVERSATION_COUNT.toString();

const DEFAULT_SYSTEM_ROLE = "You are the user's friend. Your responses should be approximately 50 words or less and use correct grammar.";
systemRoleInput.value=DEFAULT_SYSTEM_ROLE;

declare const window:any

let isListening = false;
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
        speech.speak(speechUtterance);
    });

    recognition.addEventListener('end', () => {
        if (isListening) {
            recognition.start();
        }
    });

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
    if (isListening) {
        isListening = false;
        stopRecognition();
        toggleButton.textContent = "会話を開始する";
    } else {
        isListening = true;
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

