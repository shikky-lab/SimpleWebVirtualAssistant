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
const startSoundElement = document.getElementById("startSound");
const DEFAULT_CONVERSATION_COUNT = 10;
const DEFAULT_SYSTEM_ROLE = "You are the user's friend. Your responses should be 30 words or less and use correct grammar.";
let isStarted = false;
// let recognition: SpeechRecognition;
let recognition = null;
let speech;
let speechUtterance;
let transcriptList = [];
function setupRecognitionIfNeeded() {
    if (recognition) {
        return;
    }
    const SpeechRecognition = window.speechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.addEventListener('result', (event) => __awaiter(this, void 0, void 0, function* () {
        const transcript = event.results[0][0].transcript;
        addUserMessage(transcript);
        transcriptList.push({
            role: "user",
            content: transcript
        });
        recognition.stop();
        const apiToken = apiTokenInput.value;
        const apiResponse = yield inquireToChatGPT(createQueryMessage(), apiToken);
        addAIMessage(apiResponse);
        // トランスクリプトの内容を配列に追加
        transcriptList.push({
            role: "assistant",
            content: apiResponse
        });
        // Speak API response
        speechUtterance = new SpeechSynthesisUtterance(apiResponse);
        speechUtterance.lang = "en-US";
        speechUtterance.onend = () => {
            // 読み上げが終了したら音声認識を再開
            startRecognition();
        };
        speech.speak(speechUtterance);
    }));
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
    }
    else if (role === 'ai') {
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
function playAudio(audio) {
    return new Promise(res => {
        audio.play();
        audio.onended = res;
    });
}
function startRecognition() {
    return __awaiter(this, void 0, void 0, function* () {
        setupRecognitionIfNeeded();
        recognition.start();
        yield playAudio(startSoundElement);
    });
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
                showToastMessage("received response is wrong.message=" + error.message);
            }
            else {
                console.log("There was a problem with the fetch operation:", error.message);
                showToastMessage("There was a problem with the fetch operation. message=" + error.message);
            }
            stopConversation();
            return "";
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
    console.log(queryList);
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
function startConversation() {
    return __awaiter(this, void 0, void 0, function* () {
        isStarted = true;
        speech = window.speechSynthesis;
        startRecognition();
        toggleButton.textContent = "会話を終了する";
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-danger');
    });
}
function stopConversation() {
    isStarted = false;
    stopRecognition();
    toggleButton.textContent = "会話を開始する";
    toggleButton.classList.remove('btn-danger');
    toggleButton.classList.add('btn-primary');
}
toggleButton.addEventListener("click", (event) => {
    if (isStarted) {
        stopConversation();
    }
    else {
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
    constructor(message, response) {
        super(message);
        this.name = "ResponseError";
        this.response = response;
        Object.setPrototypeOf(this, ResponseError.prototype);
    }
}
function showToastMessage(message) {
    const toastElement = document.querySelector('.toast');
    const toastBody = toastElement.querySelector('.toast-body');
    const toast = new bootstrap.Toast(toastElement);
    toastBody.textContent = message; // ここでメッセージを設定します
    toast.show();
}
function saveInputs() {
    localStorage.setItem("apiToken", apiTokenInput.value);
    localStorage.setItem("systemRole", systemRoleInput.value);
    localStorage.setItem("conversationCount", conversationCountInput.value);
}
function loadPreviousInputs() {
    apiTokenInput.value = localStorage.getItem("apiToken") || "";
    // systemRoleInput.value = localStorage.getItem("systemRole") || DEFAULT_SYSTEM_ROLE;
    systemRoleInput.value = DEFAULT_SYSTEM_ROLE;
    conversationCountInput.value = localStorage.getItem("conversationCount") || DEFAULT_CONVERSATION_COUNT.toString();
}
document.addEventListener("DOMContentLoaded", function () {
    loadPreviousInputs();
    setupRecognitionIfNeeded();
});
export {};
