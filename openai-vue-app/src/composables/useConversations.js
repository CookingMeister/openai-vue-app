import { ref, computed } from 'vue'

import {
    getAllConversations,
    putConversation,
    deleteConversationFromDB,
    putImage,
    getImage,
    deleteImagesForConversation,
} from '../utils/db.js'

// Conversation persistence, ported from section 15 of the vanilla chatapp
// script. The original rebuilt the sidebar DOM by hand and kept a signature to
// avoid redundant repaints; here the list is reactive state and Vue does that
// bookkeeping, so the signature machinery is gone.

const conversations = ref([])
const currentConversationId = ref(null)

// Object URLs minted for stored image blobs. They stay valid until revoked, so
// they are tracked per image id and released when the conversation changes --
// otherwise every reload of a chat leaks another blob into the document.
const objectUrls = new Map()

const releaseObjectUrl = (imageId) => {
    const url = objectUrls.get(imageId)
    if (!url) return

    URL.revokeObjectURL(url)
    objectUrls.delete(imageId)
}

export const releaseAllObjectUrls = () => {
    for (const url of objectUrls.values()) URL.revokeObjectURL(url)
    objectUrls.clear()
}

export const getFallbackConversationTitle = (messages = []) => {
    const firstUser = messages.find(
        (m) => m?.role === 'user' && typeof m.content === 'string' && m.content.trim(),
    )

    if (!firstUser) return 'New Chat'

    const cleaned = firstUser.content.replace(/\s+/g, ' ').trim()
    const words = cleaned.split(' ').slice(0, 8).join(' ')
    const shortTitle = words.length > 50 ? `${words.slice(0, 47)}...` : words

    return shortTitle || 'New Chat'
}

// First user message and the first assistant reply that follows it. Used to
// seed title generation, which needs both sides to say anything useful.
export const getFirstExchange = (messages = []) => {
    let firstUser = null
    let firstAssistant = null

    for (const msg of messages) {
        if (!firstUser && msg?.role === 'user' && msg.content?.trim()) {
            firstUser = msg.content.trim()
            continue
        }

        if (firstUser && !firstAssistant && msg?.role === 'assistant' && msg.content?.trim()) {
            firstAssistant = msg.content.trim()
            break
        }
    }

    return { firstUser, firstAssistant }
}

const titleGenerationInFlight = new Set()

export const useConversations = () => {
    const loadError = ref(null)

    const loadConversations = async () => {
        try {
            conversations.value = await getAllConversations()
        } catch (err) {
            console.error('Failed to load conversations from IndexedDB:', err)
            loadError.value = err.message
            conversations.value = []
        }

        return conversations.value
    }

    const currentConversation = computed(() =>
        conversations.value.find((c) => c.id === currentConversationId.value),
    )

    // Persists the conversation as it currently stands. Called after every
    // exchange, so it must be cheap and must never throw into the send path.
    const saveConversation = async (messages, { titleOverride = null, titleGenerated = false } = {}) => {
        if (!currentConversationId.value) {
            currentConversationId.value = Date.now().toString()
        }

        const existing = conversations.value.find((c) => c.id === currentConversationId.value)
        const now = Date.now()

        const data = {
            id: currentConversationId.value,
            title: titleOverride || existing?.title || getFallbackConversationTitle(messages),
            titleGenerated: titleOverride ? !!titleGenerated : !!existing?.titleGenerated,
            messages: [...messages],
            createdAt: existing?.createdAt || now,
            updatedAt: now,
        }

        if (existing) {
            Object.assign(existing, data)
        } else {
            conversations.value.unshift(data)
        }

        conversations.value.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

        await putConversation(data)
        return data
    }

    const renameConversation = async (id, newTitle, { generated = false, touch = false } = {}) => {
        const conv = conversations.value.find((c) => c.id === id)
        if (!conv) return

        const cleaned = String(newTitle || '').replace(/\s+/g, ' ').trim().slice(0, 80)
        if (!cleaned) return

        conv.title = cleaned
        conv.titleGenerated = !!generated

        if (touch) {
            conv.updatedAt = Date.now()
            conversations.value.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        }

        await putConversation(conv)
    }

    const removeConversation = async (id) => {
        await deleteConversationFromDB(id)

        // Cascade: a deleted chat takes its generated images with it.
        try {
            await deleteImagesForConversation(id)
        } catch (err) {
            console.warn('Failed to delete images for conversation:', err)
        }

        conversations.value = conversations.value.filter((c) => c.id !== id)

        if (currentConversationId.value === id) {
            currentConversationId.value = null
        }
    }

    const startNewConversation = () => {
        releaseAllObjectUrls()
        currentConversationId.value = null
    }

    // --- Images ---

    // Stores the bytes. gpt-image-1 returns base64 inline, so they are already
    // in hand -- nothing is fetched here. Under dall-e this had to download an
    // expiring remote url through a server-side proxy first.
    const persistImage = async ({ id, conversationId, messageId, blob, prompt }) => {
        if (!blob) throw new Error('No image bytes to store')

        await putImage({
            id,
            conversationId: conversationId ?? currentConversationId.value,
            messageId,
            blob,
            prompt,
            createdAt: Date.now(),
        })

        return id
    }

    // The raw bytes, for re-editing an image the user is iterating on.
    const getImageBlob = async (imageId) => {
        if (!imageId) return null

        const record = await getImage(imageId)
        return record?.blob || null
    }

    const getImageObjectUrl = async (imageId) => {
        if (!imageId) return null

        const cached = objectUrls.get(imageId)
        if (cached) return cached

        const record = await getImage(imageId)
        if (!record?.blob) return null

        const url = URL.createObjectURL(record.blob)
        objectUrls.set(imageId, url)

        return url
    }

    // --- Title generation ---

    // Fire-and-forget: a failed title leaves the fallback in place and must
    // never disturb the conversation it is naming.
    const maybeGenerateTitle = async (conversationId = currentConversationId.value) => {
        if (!conversationId) return
        if (titleGenerationInFlight.has(conversationId)) return

        const conv = conversations.value.find((c) => c.id === conversationId)
        if (!conv || conv.titleGenerated) return

        const { firstUser, firstAssistant } = getFirstExchange(conv.messages || [])
        if (!firstUser || !firstAssistant) return

        // A failed turn says nothing about the topic.
        if (/^\s*error:/i.test(firstAssistant)) return

        titleGenerationInFlight.add(conversationId)

        try {
            const res = await fetch('/api/title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: firstUser, answer: firstAssistant }),
            })

            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            const { title } = await res.json()
            if (title) await renameConversation(conversationId, title, { generated: true })
        } catch (err) {
            console.warn('Title generation failed, keeping fallback title:', err)
        } finally {
            titleGenerationInFlight.delete(conversationId)
        }
    }

    return {
        conversations,
        currentConversationId,
        currentConversation,
        loadError,
        loadConversations,
        saveConversation,
        renameConversation,
        removeConversation,
        startNewConversation,
        persistImage,
        getImageBlob,
        getImageObjectUrl,
        releaseObjectUrl,
        releaseAllObjectUrls,
        maybeGenerateTitle,
    }
}

export default useConversations
