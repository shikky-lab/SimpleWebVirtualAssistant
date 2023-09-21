import IWindow from "./i-window";
import * as Bootstrap from "bootstrap";
import { isEnglishSentence } from "./utils.js";
import * as Dictation from "./dictation.js";

const toggleButton = document.getElementById(
  "toggleButton",
) as HTMLButtonElement;
const abortButton = document.getElementById("abortButton") as HTMLButtonElement;
const transcripts = document.getElementById("transcripts") as HTMLDivElement;
const conversationCountInput = document.getElementById(
  "conversationCount",
) as HTMLInputElement;
const apiTokenInput = document.getElementById("apiToken") as HTMLInputElement;
const systemRoleInput = document.getElementById(
  "systemRole",
) as HTMLTextAreaElement;
const startSoundElement = document.getElementById(
  "startSound",
) as HTMLAudioElement;

const DEFAULT_CONVERSATION_COUNT = 10;

const DEFAULT_SYSTEM_ROLE =
  "Your responses should be 30 words or less and use correct grammar.Regardless of the language inquired, please respond in English.";

declare const window: any;
declare var bootstrap: typeof Bootstrap;

type MessageType = {
  role: string;
  content: string;
};
let transcriptList: MessageType[] = [];

function appendMessageToChat(role, labelContent, messageText) {
  const chatContainer = document.querySelector(".chat-container");
  const messageDiv = document.createElement("div");
  const labelSpan = document.createElement("span");
  const textSpan = document.createElement("span");

  labelSpan.textContent = labelContent;
  labelSpan.classList.add("label");

  textSpan.textContent = messageText;
  textSpan.classList.add("text");

  messageDiv.classList.add("chat-message");

  if (role === "user") {
    messageDiv.classList.add("user-message");
    messageDiv.appendChild(labelSpan);
    messageDiv.appendChild(textSpan);
  } else if (role === "ai") {
    messageDiv.classList.add("ai-message");
    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(labelSpan);
  }

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addUserMessage(message) {
  appendMessageToChat("user", "YOU: ", message);
  transcriptList.push({
    role: "user",
    content: message,
  });
}

function addAIMessage(message) {
  appendMessageToChat("ai", " :AI", message);
  transcriptList.push({
    role: "assistant",
    content: message,
  });
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
async function inquireToChatGPT(messages: MessageType[], token: string) {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    console.log(data); // レスポンスをコンソールに表示
    if (!data?.choices?.[0]?.message?.content) {
      throw new ResponseError(
        "Expected data structure not received from OpenAI API",
        data,
      );
    }
    const content = data.choices[0].message.content;
    return content;
  } catch (error) {
    if (error instanceof ResponseError) {
      console.log("received response is wrong", error.message);
      showToastMessage("received response is wrong.message=" + error.message);
    } else {
      console.log(
        "There was a problem with the fetch operation:",
        error.message,
      );
      showToastMessage(
        "There was a problem with the fetch operation. message=" +
          error.message,
      );
    }

    return "";
  }
}

function createQueryMessage() {
  const n = isNaN(parseInt(conversationCountInput.value))
    ? DEFAULT_CONVERSATION_COUNT
    : parseInt(conversationCountInput.value);

  const systemRole: MessageType = {
    role: "system",
    content: systemRoleInput.value,
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

class ResponseError extends Error {
  public response: any;

  constructor(message: string, response: any) {
    super(message);
    this.name = "ResponseError";
    this.response = response;

    Object.setPrototypeOf(this, ResponseError.prototype);
  }
}

function showToastMessage(message) {
  const toastElement = document.querySelector(".toast");
  const toastBody = toastElement.querySelector(".toast-body");
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
  conversationCountInput.value =
    localStorage.getItem("conversationCount") ||
    DEFAULT_CONVERSATION_COUNT.toString();
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("content loaded");
  loadPreviousInputs();

  const generateResponse: Dictation.onTranscriptionReceivedCallback = async (
    transcript: string,
  ) => {
    addUserMessage(transcript);
    const apiToken = apiTokenInput.value;
    const apiResponse = await inquireToChatGPT(createQueryMessage(), apiToken);
    processAfterResponse(apiResponse);
  };
  let dictation = new Dictation.Dictation(
    apiTokenInput,
    toggleButton,
    abortButton,
    startSoundElement,
    generateResponse,
  );

  type onResponseReceivedCallback = (message: string) => void;
  const processAfterResponse: onResponseReceivedCallback = (
    message: string,
  ) => {
    addAIMessage(message);
    speechMessage(message);
  };

  const speechMessage = (message: string) => {
    // Speak API response
    let speechUtterance = new SpeechSynthesisUtterance(message);

    speechUtterance.lang = isEnglishSentence(message) ? "en" : "ja";
    speechUtterance.onend = () => {
      // 読み上げが終了したら音声認識を再開
      dictation.startRecogntionWithUI();
    };

    let speech: SpeechSynthesis = window.speechSynthesis;
    speech.speak(speechUtterance);
  };

  toggleButton.addEventListener("click", async (event) => {
    const apiToken = apiTokenInput.value;
    if (!apiToken) {
      showToastMessage("There is no API token. Please enter your API token.");
      return;
    }
    saveInputs();
    try {
      await dictation.onClick();
    } catch (error) {
      showToastMessage("Failed to start dictation" + error.message);
    }
  });

  abortButton.addEventListener("click", async (event) => {
    dictation.abortDictation();
  });
});

const adjustMiddleContentHeight = () => {
  const topContentHeight = document.getElementById("top-content").offsetHeight;
  const bottomContentHeight =
    document.getElementById("bottom-content").offsetHeight;
  const availableHeight =
    window.innerHeight - topContentHeight - bottomContentHeight;

  document.getElementById("transcripts").style.maxHeight =
    availableHeight + "px";

  //   console.log("new contentHeight:", availableHeight);
};

// ページ読み込み時に実行
window.addEventListener("load", adjustMiddleContentHeight);

// ウィンドウサイズが変わったときに実行
window.addEventListener("resize", adjustMiddleContentHeight);
