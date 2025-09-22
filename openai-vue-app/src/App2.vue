<template>
    <div class="d-flex flex-column vh-100">
        <header class="app-header">
            <div class="chat-wrapper">
                <div class="d-flex justify-content-between align-items-center p-3">
                    <h1 class="h4 mb-0 ms-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor"
                            class="bi bi-openai" viewBox="0 0 22 22">
                            <path
                                d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
                        </svg>
                        AI Chat
                    </h1>
                    <div class="d-flex align-items-center gap-3">
                        <button id="clearChat" class="btn btn-outline-secondary btn-clear" @click="onClearChat"
                            data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Clear Chat History">
                            <i class="bi bi-trash"></i>
                        </button>
                        <div id="connectionStatus" class="d-flex align-items-center gap-2">
                            <div :class="['status-dot', connectionDotClass, 'ms-2 me-1']"></div>
                            <small style="color: var(--text-muted)">{{ connectionText }}</small>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <main class="flex-fill">
            <div class="chat-wrapper flex-fill">
                <div ref="chatContainer" id="chatContainer" class="chat-container flex-fill p-3">
                    <div v-for="(msg, idx) in messages" :key="msg.id"
                        :class="['d-flex', 'align-items-start', 'gap-3', 'mb-4', 'message-fade-in', msg.role === 'user' ? 'flex-row-reverse' : '']">
                        <div :class="['chat-avatar', 'flex-shrink-0', msg.role === 'user' ? 'bg-secondary' : '']">
                            <svg v-if="msg.role === 'user'" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round" class="text-white">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="text-white">
                                <path d="M12 8V4H8" />
                                <rect width="16" height="12" x="4" y="8" rx="2" />
                                <path d="M2 14h2" />
                                <path d="M20 14h2" />
                                <path d="M15 13v2" />
                                <path d="M9 13v2" />
                            </svg>
                        </div>
                        <div
                            :class="['message-bubble', msg.role === 'user' ? 'user-message' : 'bot-message', 'p-3', 'rounded']">
                            <template v-if="msg.role === 'bot'">
                                <div>
                                    <div v-if="msg.isImage && msg.imageUrl"
                                        class="img-block-wrapper position-relative d-inline-block mb-2">
                                        <img :src="'/api/image-proxy?url=' + encodeURIComponent(msg.imageUrl)"
                                            :alt="msg.imagePrompt || ''" class="img-fluid rounded shadow-sm"
                                            style="max-width: 100%; border-radius: 7px" />

                                        <!-- Refine/Iterate button (left of download button): -->
                                        <button class="btn btn-sm btn-outline-secondary img-download-btn"
                                            style="position: absolute; top: 8px; right: 48px; opacity: 0.8; z-index: 21"
                                            @click="handleIterateImage(msg.imageInfo)" :disabled="!msg.imageUrl"
                                            title="Make a Variation">
                                            <i class="bi bi-arrow-repeat"></i>
                                        </button>

                                        <!-- Download button: -->
                                        <button class="btn btn-sm btn-outline-secondary img-download-btn"
                                            style="position: absolute; top: 8px; right: 8px; opacity: 0.8; z-index: 20"
                                            @click="downloadImage(msg.imageUrl, msg.imagePrompt)"
                                            title="Download image">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                                                fill="currentColor" class="bi bi-download" viewBox="0 0 16 16">
                                                <path
                                                    d="M.5 9.9V14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9.9a.5.5 0 0 0-1 0V14a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V9.9a.5.5 0 0 0-1 0z" />
                                                <path
                                                    d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708l3 3z" />
                                            </svg>
                                        </button>
                                        <div v-if="msg.imagePrompt" class="small ms-2 mt-2">{{ msg.imagePrompt }}</div>
                                    </div>
                                    <div v-else class="message-content small" v-html="msg.html"
                                        :ref="el => setBotMsgContentRef(idx, el)"></div>
                                    <div class="message-timestamp" :title="longTimestamp(msg.timestamp)">{{
                                        timestamp(msg.timestamp) }}</div>
                                </div>
                            </template>
                            <template v-else>
                                <div class="message-content small" style="white-space: pre-wrap">
                                    {{ msg.content }}
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <footer class="app-header">
            <div class="chat-wrapper p-3">
                <div class="input-area rounded p-3">
                    <div class="d-flex align-items-end justify-content-center gap-3">
                        <div class="flex-fill mb-4 mb-sm-0">
                            <textarea ref="promptInput" id="promptInput" class="form-control message-input"
                                placeholder="Type your message... (Shift+Enter for new line)" rows="1" v-model="input"
                                @input="autoResize" @keydown="onInputKeydown"></textarea>
                        </div>
                        <div class="d-flex flex-column flex-sm-row gap-3">
                            <button id="imageBtn" class="btn btn-outline-secondary d-flex align-items-center gap-2"
                                @click="showImageModal = true" data-bs-toggle="tooltip" data-bs-placement="top"
                                data-bs-title="Generate image from prompt">
                                <i class="bi bi-image"></i>
                            </button>
                            <button id="sendBtn" :disabled="isSending || input.trim().length < 2"
                                class="btn btn-primary d-flex align-items-center gap-2" @click="send">
                                <i class="bi bi-send"></i>
                                <span>Send</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small id="statusText" style="color: var(--text-muted)">{{ status }}</small>
                    <small id="messageCount" style="color: var(--text-muted)">{{ messages.length }} messages</small>
                </div>
            </div>
        </footer>

        <div v-if="showImageModal" class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5)"
            id="imagePromptModal" tabindex="-1" aria-labelledby="imagePromptModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="imagePromptModalLabel">
                            <i class="bi bi-image me-1"></i> Generate Image
                        </h5>
                        <button type="button" class="btn-close btn-close-white" @click="showImageModal = false"
                            aria-label="Close" tabindex="-1"></button>
                    </div>
                    <div class="modal-body">
                        <input type="text" class="form-control image-prompt" id="imagePromptInput"
                            placeholder="Describe the image you want..." v-model="imagePrompt"
                            @keydown.enter.prevent="handleImagePrompt" autocomplete="off" spellcheck="true" autofocus />
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="cancelImageBtn" class="btn btn-outline-secondary btn-modal-cancel"
                            @click="showImageModal = false">Cancel</button>
                        <button type="button" id="generateImageBtn" class="btn btn-primary" @click="handleImagePrompt">
                            <i class="bi bi-magic"></i> Generate
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="showIterateModal" class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5)"
            id="iterateImageModal" tabindex="-1" aria-labelledby="iterateImageModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="iterateImageModalLabel">
                            <i class="bi bi-magic me-1"></i> Variation of Image
                        </h5>
                        <button type="button" class="btn-close btn-close-white" @click="showIterateModal = false"
                            aria-label="Close" tabindex="-1"></button>
                    </div>
 
                    <div class="modal-footer">
                        <button type="button" id="cancelIterateBtn" class="btn btn-outline-secondary btn-modal-cancel"
                            @click="showIterateModal = false">Cancel</button>
                        <button type="button" id="confirmIterateBtn" class="btn btn-primary"
                            @click="handleConfirmIterate">
                            <i class="bi bi-arrow-repeat"></i> Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { marked } from 'marked'
import Prism from 'prismjs'

// --- State ---
const input = ref('')
const messages = reactive([])
const status = ref('Ready')
const imagePrompt = ref('')
const iterateInstruction = ref('')
const showImageModal = ref(false)
const showIterateModal = ref(false)
const promptInput = ref(null)
const chatContainer = ref(null)
const isSending = ref(false)
const images = reactive([])
const iterationTarget = ref(null)
const connectionStatus = ref('disconnected')

const MAX_HISTORY = 16

// --- Computed ---
const connectionDotClass = computed(() =>
    connectionStatus.value === 'connected'
        ? 'bg-success'
        : connectionStatus.value === 'connecting'
            ? 'bg-warning status-connecting'
            : 'bg-secondary'
)
const connectionText = computed(() =>
    connectionStatus.value.charAt(0).toUpperCase() + connectionStatus.value.slice(1)
)

// --- For code enhancement (prism/copy) ---
const botMsgContentRefs = ref([])
function setBotMsgContentRef(idx, el) {
    if (el) botMsgContentRefs.value[idx] = el
}

// --- Utilities ---
function timestamp(ts) {
    const date = new Date(ts)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    return isToday
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}
function longTimestamp(ts) {
    const date = new Date(ts)
    return date.toLocaleString()
}
function addWelcomeMessage(
    resetMsg = "Hello! I'm your AI assistant. Start chatting to get help with any questions you have."
) {
    messages.splice(0, messages.length)
    messages.push({
        id: Date.now() + 1,
        content: resetMsg,
        html: marked.parse(resetMsg),
        role: 'bot',
        timestamp: Date.now(),
    })
}

// --- Lifecycle ---
onMounted(() => {
    addWelcomeMessage()
    autoResize()
})

function autoResize() {
    const el = promptInput.value
    if (!el) return
    el.style.height = "auto"
    const minHeight = 40
    const maxHeight = window.innerWidth <= 768 ? 160 : 200
    el.style.height = Math.max(minHeight, Math.min(el.scrollHeight, maxHeight)) + "px"
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden"
}
function onInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isSending.value && input.value.trim().length >= 2) send()
    }
}
function scrollToBottom() {
    nextTick(() => {
        const el = chatContainer.value
        if (el) el.scrollTop = el.scrollHeight
    })
    setTimeout(() => {
        const el = chatContainer.value
        if (el) el.scrollTop = el.scrollHeight
    }, 100)
}
function onClearChat() {
    if (!window.confirm('Clear all chat messages?')) return
    addWelcomeMessage('Chat cleared. How can I help you today?')
    input.value = ''
    status.value = 'Ready'
    autoResize()
}

// --- Image Generation ---
async function generateImage(prompt) {
    //const apiKey = getApiKey()
    //if (!apiKey) throw new Error("API key not configured")
    const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024"
        }),
    })
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }
    const data = await response.json()
    if (!data.data || !data.data[0]?.url) throw new Error("No image returned.")
    return {
        url: data.data[0].url,
        image_id: data.data[0].id,
        prompt: prompt,
    }
}

async function generateImageVariation(imageUrl, prompt) {
    //const apiKey = getApiKey();
    //if (!apiKey) throw new Error("API key not configured");
    if (!imageUrl) throw new Error("No imageUrl provided for variation.");

    // Fetch the image as blob via your CORS proxy
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    const resp = await fetch(proxyUrl);
    const blob = await resp.blob();

    // Create FormData and append fields
    const formData = new FormData();
    // image must be a PNG file and named e.g. 'image.png'
    formData.append("image", blob, "image.png");
    formData.append("n", "1");
    formData.append("size", "1024x1024");

    const response = await fetch("https://api.openai.com/v1/images/variations", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            // DON'T set 'Content-Type'! The browser does it automatically for FormData.
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data.data || !data.data[0]?.url) throw new Error("No image returned.");
    return {
        url: data.data[0].url,
        prompt: prompt,
    };
}

function downloadImage(url, altText) {
    // The URL now points to your local /api endpoint.
    // Vite will handle forwarding it to http://localhost:3000/image-proxy
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;

    fetch(proxyUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Proxy request failed with status ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            const ext = blob.type.includes('png') ? '.png' : '.jpg';
            a.download = (altText ? altText.replace(/\W+/g, '_') : 'image') + ext;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
            console.error('Download failed:', error);
        });
}

// --- Image Modal handlers ---
function handleImagePrompt() {
    const prompt = imagePrompt.value.trim()
    if (prompt.length < 3) return
    showImageModal.value = false
    requestImage(prompt)
    imagePrompt.value = ''
}
function requestImage(prompt) {
    // Add user message
    messages.push({
        id: Date.now() + Math.random(),
        content: prompt,
        html: '',
        role: 'user',
        timestamp: Date.now(),
    })
    // Add bot message placeholder
    const botMsg = {
        id: Date.now() + Math.random(),
        content: 'Generating image...',
        html: '',
        role: 'bot',
        timestamp: Date.now(),
        isImage: true,
        imageUrl: null,
        imagePrompt: prompt
    }
    messages.push(botMsg)
    scrollToBottom()
    isSending.value = true
    connectionStatus.value = 'connecting'
    status.value = 'Requesting image...'
    generateImage(prompt)
        .then(({ url, image_id, prompt: resultPrompt }) => {
            const imageInfo = {
                id: Date.now().toString(36),
                url,
                prompt: resultPrompt,
            }
            images.push(imageInfo)
            botMsg.content = ''
            botMsg.imageUrl = url
            botMsg.imageInfo = imageInfo
            status.value = 'Image generated'
            connectionStatus.value = 'connected'
        })
        .catch((error) => {
            const errorMsg = error.message || "An unexpected error occurred"
            botMsg.content = `Error: ${errorMsg}`
            botMsg.html = `<span style="color:#dc3545;">Error: ${errorMsg}</span>`
            status.value = `Error: ${errorMsg}`
            connectionStatus.value = 'disconnected'
        })
        .finally(() => {
            isSending.value = false
        })
}
function handleIterateImage(imageInfo) {
    iterationTarget.value = imageInfo
    showIterateModal.value = true
}
function handleConfirmIterate() {
    const instruction = iterateInstruction.value.trim()
    if (instruction.length < 2) return
    showIterateModal.value = false
    requestImageIteration(instruction, iterationTarget.value)
    iterateInstruction.value = ''
}
async function requestImageIteration(iteratePrompt, target) {
    messages.push({
        id: Date.now() + Math.random(),
        content: `Iterate image: ${iteratePrompt}`,
        html: '',
        role: 'user',
        timestamp: Date.now(),
    })
    const botMsg = {
        id: Date.now() + Math.random(),
        content: 'Generating image variation...',
        html: '',
        role: 'bot',
        timestamp: Date.now(),
        isImage: true,
        imageUrl: null,
        imagePrompt: iteratePrompt
    }
    messages.push(botMsg)
    scrollToBottom()
    isSending.value = true
    connectionStatus.value = 'connecting'
    status.value = 'Generating image...'
    try {
        if (!target.url) throw new Error("No image URL for the base image.")
        const { url, prompt: resultPrompt } = await generateImageVariation(target.url, iteratePrompt)
        const imageInfo = {
            id: Date.now().toString(36),
            url,
            prompt: iteratePrompt
        }
        images.push(imageInfo)
        botMsg.content = ''
        botMsg.imageUrl = url
        botMsg.imageInfo = imageInfo
        status.value = 'Image generated'
        connectionStatus.value = 'connected'
    } catch (error) {
        const errorMsg = error.message || "An unexpected error occurred"
        botMsg.content = `Error: ${errorMsg}`
        botMsg.html = `<span style="color:#dc3545;">Error: ${errorMsg}</span>`
        status.value = `Error: ${errorMsg}`
        connectionStatus.value = 'disconnected'
    } finally {
        isSending.value = false
        iterationTarget.value = null
    }
}

// --- Chat Send ---
async function send() {
    if (isSending.value) return
    const prompt = input.value.trim()
    if (!prompt) return
    isSending.value = true
    connectionStatus.value = 'connecting'
    status.value = ' to OpenAI...'
    messages.push({
        id: Date.now() + Math.random(),
        content: prompt,
        html: '',
        role: 'user',
        timestamp: Date.now(),
    })
    input.value = ''
    autoResize()
    scrollToBottom()
    const botMsg = {
        id: Date.now() + Math.random(),
        content: '',
        html: '',
        role: 'bot',
        timestamp: Date.now(),
    }
    messages.push(botMsg)
    scrollToBottom()
    const history = []
    for (let i = Math.max(0, messages.length - MAX_HISTORY * 2); i < messages.length; i++) {
        if (messages[i].role === 'user' || messages[i].role === 'bot') {
            const role = messages[i].role === 'bot' ? 'assistant' : 'user'
            history.push({ role, content: messages[i].content })
        }
    }
    try {
        await streamOpenAI(history, botMsg)
        status.value = 'Response completed'
        connectionStatus.value = 'connected'
    } catch (e) {
        status.value = 'Error: ' + (e.message || 'An unexpected error occurred')
        connectionStatus.value = 'disconnected'
        botMsg.html = `<span style="color:#dc3545;">Error: ${e.message}</span>`
    } finally {
        isSending.value = false
        input.value = ''
        nextTick(autoResize)
    }
}

// --- OpenAI Streaming ---
async function streamOpenAI(messagesHistory, botMsg) {
    connectionStatus.value = 'connecting'
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesHistory })
    })
    if (!response.ok) {
        const errMsg = await response.text()
        throw new Error(errMsg)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullResponse = ''
    let done = false
    while (!done) {
        const { value, done: doneReading } = await reader.read()
        if (doneReading) break
        buffer += decoder.decode(value, { stream: true })
        let lines = buffer.split('\n')
        for (let i = 0; i < lines.length; i++) {
            const ln = lines[i].trim()
            if (!ln.startsWith('data:')) continue
            let rest = ln.replace(/^data: ?/, '')
            if (rest === '[DONE]') {
                done = true
                break
            }
            try {
                const obj = JSON.parse(rest)
                const chunk = obj.choices?.[0]?.delta?.content
                if (chunk) {
                    fullResponse += chunk
                    botMsg.content = fullResponse
                    botMsg.html = marked.parse(fullResponse)
                    nextTick(() => {
                        highlightAndCopy(toolbarRefForLastBotMsg())
                    })
                    scrollToBottom()
                }
            } catch (e) {
                console.log('Error parsing chunk', e, rest)
            }
        }
        buffer = lines.at(-1) ?? ''
    }
    botMsg.content = fullResponse
    botMsg.html = marked.parse(fullResponse)
    await nextTick()
    highlightAndCopy(toolbarRefForLastBotMsg())
}

// function getApiKey() {
//     // Replace with your method or settings
//     return ""
// }

// --- Prism+Copy: Enhance code blocks after render ---
function highlightAndCopy(el) {
    if (!el) return
    el.querySelectorAll('pre > code').forEach((codeEl) => {
        const pre = codeEl.parentElement
        if (pre.parentElement.classList.contains('code-block-wrapper')) return
        const wrapper = document.createElement('div')
        wrapper.className = "code-block-wrapper"
        let langName = ''
        pre.classList.forEach(cls => {
            if (cls.startsWith('language-')) langName = cls.slice(9)
        })
        codeEl.classList.forEach(cls => {
            if (cls.startsWith('language-')) langName = langName || cls.slice(9)
        })
        const header = document.createElement('div')
        header.className = "pre-header d-flex justify-content-between align-items-center"
        const langLabel = document.createElement('span')
        langLabel.className = "code-lang-label small"
        langLabel.textContent = langName || "code"
        const btn = document.createElement('button')
        btn.className = "btn btn-sm btn-outline-secondary copy-btn"
        btn.innerHTML = '<i class="bi bi-copy px-1"></i>'
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(codeEl.textContent)
                .then(() => {
                    btn.textContent = "Copied!"
                    setTimeout(() => { btn.innerHTML = '<i class="bi bi-copy px-1"></i>' }, 2000)
                })
        })
        header.appendChild(langLabel)
        header.appendChild(btn)
        pre.parentNode.replaceChild(wrapper, pre)
        wrapper.appendChild(header)
        wrapper.appendChild(pre)
        Prism.highlightAllUnder(pre)
    })
}
function toolbarRefForLastBotMsg() {
    return botMsgContentRefs.value[botMsgContentRefs.value.length - 1]
}
watch(
    () => messages.length,
    () => {
        nextTick(() => {
            highlightAndCopy(toolbarRefForLastBotMsg())
        })
        scrollToBottom()
    }
)
</script>

<style>
/*************************************************************
    Root Variables & Theme
    **************************************************************/
:root {
    /* Background Colors */
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --bg-tertiary: #374151;
    --bg-accent: #2563eb;
    --bg-bot: #6366f1;

    /* Border & Divider Colors */
    --border-color: #4b5563;

    /* Text Colors */
    --text-primary: #f9fafb;
    --text-secondary: #9ca3af;
    --text-muted: #6b7280;
}

/*************************************************************
    Base Styles & Body
    **************************************************************/
body,
html {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    margin: initial;
    padding: initial;
    font-size: var(--bs-body-font-size, 1rem);
    font-family: var(--bs-font-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
    line-height: var(--bs-body-line-height, 1.5);
}

html,
body,
#C0,
#C0D {
    height: 100%;
    overflow-x: hidden;
}

/*************************************************************
    Layout & Containers
    **************************************************************/
.chat-container {
    flex: 1 1 auto;
    overflow-y: auto;
}

#C2 {
    position: static !important;
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    width: 100% !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
}

.chat-wrapper {
    box-sizing: border-box;
    max-width: 1024px;
    margin: 0 auto;
    width: 100%;
}

main.flex-fill,
.chat-wrapper.flex-fill,
.chat-container.flex-fill {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.chat-container.flex-fill {
    flex: 1 1 auto;
    overflow-y: auto;
    min-height: 0;
}

/*************************************************************
    Custom Scrollbar
    **************************************************************/
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
}

/*************************************************************
    Header
    **************************************************************/
.app-header {
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
}

/*************************************************************
    Custom Tooltip
    **************************************************************/
.tooltip {
    --bs-tooltip-bg: var(--bg-tertiary);
    --bs-tooltip-color: var(--text-primary);
    --bs-tooltip-border-color: var(--border-color);
}

.tooltip .tooltip-inner {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1.5px solid var(--border-color);
    border-radius: 0.375rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
}

/* Directional Tooltip Borders */
.tooltip.bs-tooltip-top .tooltip-arrow::before {
    border-top-color: var(--border-color);
}

.tooltip.bs-tooltip-bottom .tooltip-arrow::before {
    border-bottom-color: var(--border-color);
}

.tooltip.bs-tooltip-start .tooltip-arrow::before {
    border-left-color: var(--border-color);
}

.tooltip.bs-tooltip-end .tooltip-arrow::before {
    border-right-color: var(--border-color);
}

.tooltip-arrow {
    z-index: 5000 !important;
}

/*************************************************************
    Status Indicator Dot & Animation
    **************************************************************/
.status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
    }

    70% {
        box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    }
}

.status-connecting {
    animation: pulse 1s infinite;
}

/*************************************************************
    Message Appearance & Animation
    **************************************************************/
.message-fade-in {
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/*************************************************************
    Message Timestamp (Bot Only, Hover to Show)
    **************************************************************/
.message-timestamp {
    position: absolute;
    top: 2px;
    right: -65px;
    background-color: var(--bg-primary);
    color: var(--text-secondary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    z-index: 1000;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: opacity 0.2s, visibility 0.2s;
}

.bot-message:hover .message-timestamp {
    opacity: 1;
    visibility: visible;
}

/* Responsive Timestamp on Mobile */
@media (max-width: 768px) {
    .message-timestamp {
        top: 3px;
        right: -60px;
        font-size: 0.65rem;
        padding: 2px 5px;
    }
}

/*************************************************************
    Avatar & Message Bubbles
    **************************************************************/
.chat-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-bot);
}

.message-bubble {
    max-width: 78%;
    word-wrap: break-word;
    position: relative;
    margin-top: .175rem;
}

/* User & Bot Message Bubbles */
.user-message {
    background-color: var(--bg-accent);
    border-top-right-radius: .1rem !important;
}

.bot-message {
    background-color: var(--bg-secondary);
    border-top-left-radius: .1rem !important;
}

/*************************************************************
    Input Areas
    **************************************************************/
.input-area {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
}

/* General Input Style, DRY via grouping */
.form-control,
.message-input {
    background-color: var(--bg-secondary) !important;
    border: 1px solid var(--border-color) !important;
    color: var(--text-primary) !important;
}

.form-control:focus {
    border-color: var(--bg-bot) !important;
    box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25) !important;
}

.form-control::placeholder,
.message-input::placeholder {
    color: var(--text-muted);
}

/* Message Input Specific Styles */
.message-input {
    resize: none;
    overflow-y: hidden;
    min-height: 40px;
    max-height: 200px;
    background-color: transparent !important;
    border: none !important;
    line-height: 1.5;
    word-break: break-word;
}

.message-input:focus {
    box-shadow: none !important;
    border: none !important;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
    .message-input {
        max-height: 160px;
    }

    .input-area {
        margin: 0 -0.5rem;
        border-radius: 0.5rem !important;
    }
}

/*************************************************************
    Message Content: Code Blocks, Inline Code, Lists, Headings
    **************************************************************/
/* Code Block Wrapper */
.code-block-wrapper {
    position: relative;
    margin: 0.75rem 0;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    display: flex;
    flex-direction: column;
}

.code-block-wrapper:hover .copy-btn {
    opacity: 1;
}

/* Code Styling */
.message-content pre {
    background-color: var(--bg-primary) !important;
    border: none;
    border-bottom-left-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    margin: 0;
    overflow: auto;
    padding: 1rem !important;
}

.message-content pre>code {
    display: block;
    padding: 0 0.375rem;
}

/* Remove unwanted default code block styling */
pre[class*="language-"] {
    margin: 0 !important;
}

/* Inline code styling */
.message-content code:not(pre code) {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.875em;
}

/* Code Block Header & Lang Label */
.pre-header {
    background-color: var(--bg-primary);
    padding: 0.15rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-color);
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
}

.code-lang-label {
    user-select: none;
    color: var(--text-secondary);
}

/* Lists (Ul & Ol) */
.message-content ol {
    list-style: none;
    counter-reset: list-counter;
}

.message-content ul,
.message-content ol {
    padding-left: 0.5rem;
}

.message-content ol>li {
    counter-increment: list-counter;
    margin-bottom: 0.5rem;
    position: relative;
}

.message-content ol>li::before {
    content: counter(list-counter) ".";
    color: var(--bg-bot);
    font-weight: bold;
    margin-right: 0.5rem;
    display: inline-block;
    text-align: right;
}

.message-content ul>li {
    margin-bottom: 0.25rem;
    margin-left: 1.25rem;
    position: relative;
}

/* Message paragraphs and headings */
.message-content p {
    margin: 0.25rem;
}

.message-content li>p {
    display: inline;
}

.message-content h1,
.message-content h2,
.message-content h3,
.message-content h4,
.message-content h5,
.message-content h6 {
    padding: 0.5rem 0 0.25rem;
    margin-left: 0.4rem;
}

/*************************************************************
    Buttons & Interactions
    **************************************************************/
.btn {
    line-height: var(--bs-btn-line-height) !important;
    font-size: var(--bs-btn-font-size) !important;
}

.btn-primary {
    background-color: var(--bg-accent);
    border-color: var(--bg-accent);
    transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
    background-color: #1d4ed8;
    border-color: #1d4ed8;
}

.btn-primary:disabled {
    background-color: var(--bg-bot);
    border-color: var(--bg-bot);
    cursor: not-allowed;
    opacity: 0.45;
}

.btn-primary:not(:disabled) {
    animation: buttonEnable 0.3s ease;
}

@keyframes buttonEnable {
    from {
        transform: scale(0.95);
        opacity: 0.8;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}

.btn-secondary {
    background-color: var(--border-color);
    border-color: var(--border-color);
    color: var(--text-primary);
}

.btn-secondary:hover {
    background-color: var(--text-muted);
    border-color: var(--text-muted);
    color: var(--text-primary);
}

.btn .bi-trash {
    margin: -0.5rem;
}

.btn-clear {
    transition: all 0.2s ease-in-out;
    transform: scale(1.4);
    border: none;
}

.btn-clear:hover,
.btn-clear:focus {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

.btn-outline-secondary:hover {
    background-color: var(--bg-secondary);
    border-color: var(--bg-secondary);
}

/* Copy-to-Clipboard Button */
.copy-btn {
    z-index: 10;
    opacity: 0.4;
    transition: all 0.2s;
    transform: scale(0.785);
    margin-right: -0.85rem;
}

.img-block-wrapper .img-download-btn {
    border: none;
    outline: none;
    background: rgba(40, 40, 56, 0.65);
    color: #f9fafb;
    border-radius: .375rem;
    padding: .2rem .35rem;
    transition: background 0.18s, opacity 0.22s;
    box-shadow: 0 1px 8px #0002;
}

.img-block-wrapper .img-download-btn:hover,
.img-block-wrapper .img-download-btn:focus {
    background: #141529;
    color: #60a5fa;
    opacity: 1;
}

#imageBtn {
    min-width: 36px;
    min-height: 36px;
    padding: 0 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bi-image {
    font-size: 1.25rem;
}

.modal .modal-content {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.btn-modal-cancel:hover {
    border-color: var(--text-primary);
}

.image-prompt {
    background: var(--bg-tertiary) !important;
}

.tooltip .tooltip-inner {
    background: #292c38;
    padding: .875rem;
}
</style>