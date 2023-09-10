var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
console.log("start script");
const toggleButton = document.getElementById("toggleButton");
const transcripts = document.getElementById("transcripts");
const conversationCountInput = document.getElementById("conversationCount");
const apiTokenInput = document.getElementById("apiToken");
const systemRoleInput = document.getElementById("systemRole");
const DEFAULT_CONVERSATION_COUNT = 10;
conversationCountInput.value = DEFAULT_CONVERSATION_COUNT.toString();
const DEFAULT_SYSTEM_ROLE = "You are the user's friend. Your responses should be approximately 50 words or less and use correct grammar.";
systemRoleInput.value = DEFAULT_SYSTEM_ROLE;
let isListening = false;
// let recognition: SpeechRecognition;
let recognition;
let speech;
let speechUtterance;
let transcriptList = [];
function startRecognition() {
    const SpeechRecognition = window.speechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.addEventListener('result', (event) => __awaiter(this, void 0, void 0, function* () {
        const transcript = event.results[0][0].transcript;
        // Display user input
        transcripts.innerHTML += `<div>YOU：${transcript}</div>`;
        transcriptList.push({
            role: "user",
            content: transcript
        });
        const apiToken = apiTokenInput.value;
        const apiResponse = yield inquireToChatGPT(createQueryMessage(), apiToken);
        // Display API response
        transcripts.innerHTML += `<div>AI：${apiResponse}</div>`;
        // トランスクリプトの内容を配列に追加
        transcriptList.push({
            role: "assistant",
            content: apiResponse
        });
        // Speak API response
        speechUtterance = new SpeechSynthesisUtterance(apiResponse);
        speechUtterance.lang = "en-US";
        speech.speak(speechUtterance);
    }));
    recognition.addEventListener('end', () => {
        if (isListening) {
            recognition.start();
        }
    });
    recognition.start();
}
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
function inquireToChatGPT(messages, token) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(OPENAI_API_URL, {
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
            const data = yield response.json();
            console.log(data); // レスポンスをコンソールに表示
            if (!((_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content)) {
                throw new ResponseError("Expected data structure not received from OpenAI API", data);
            }
            const content = data.choices[0].message.content;
            return content;
        }
        catch (error) {
            if (error instanceof ResponseError) {
                console.log("received response is wrong", error.message);
                console.log(error.response);
            }
            else {
                console.log("There was a problem with the fetch operation:", error.message);
            }
        }
    });
}
function createQueryMessage() {
    const n = isNaN(parseInt(conversationCountInput.value))
        ? DEFAULT_CONVERSATION_COUNT
        : parseInt(conversationCountInput.value);
    const systemRole = {
        "role": "system",
        "content": systemRoleInput.value
    };
    const queryList = getLastNTranscripts(n);
    queryList.unshift(systemRole);
    return queryList;
}
// n個前の会話までを取得する関数
function getLastNTranscripts(n) {
    return transcriptList.slice(-n);
}
function stopRecognition() {
    recognition.stop();
    recognition = null;
}
toggleButton.addEventListener("click", () => {
    console.log("button pressed");
    if (isListening) {
        isListening = false;
        stopRecognition();
        toggleButton.textContent = "会話を開始する";
    }
    else {
        isListening = true;
        speech = window.speechSynthesis;
        startRecognition();
        toggleButton.textContent = "会話を終了する";
    }
});
class ResponseError extends Error {
    constructor(message, response) {
        super(message);
        this.name = "ResponseError";
        this.response = response;
        Object.setPrototypeOf(this, ResponseError.prototype);
    }
}
export {};