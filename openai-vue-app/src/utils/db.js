// IndexedDB layer, ported from the vanilla chatapp script.
//
// Generated images live in their own store so the conversation records stay
// small: getAll() on startup and the per-message rewrite in saveConversation()
// must never drag image blobs around.

const DB_NAME = 'PLBChatDB'
const DB_VERSION = 2

export const CONVERSATION_STORE = 'conversations'
export const IMAGE_STORE = 'images'

let dbPromise = null

export const openChatDB = () => {
    if (dbPromise) return dbPromise

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const db = event.target.result

            if (!db.objectStoreNames.contains(CONVERSATION_STORE)) {
                const store = db.createObjectStore(CONVERSATION_STORE, { keyPath: 'id' })

                store.createIndex('updatedAt', 'updatedAt', { unique: false })
                store.createIndex('createdAt', 'createdAt', { unique: false })
            }

            // v2: generated images, keyed by image id, indexed for cascade delete.
            if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                const imgStore = db.createObjectStore(IMAGE_STORE, { keyPath: 'id' })

                imgStore.createIndex('conversationId', 'conversationId', { unique: false })
                imgStore.createIndex('messageId', 'messageId', { unique: false })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)

        // Fires if an older-version connection is still open in another tab.
        // Without this the upgrade just hangs with no error.
        request.onblocked = () =>
            reject(
                new Error(
                    `${DB_NAME} upgrade to v${DB_VERSION} is blocked by another open connection.`,
                ),
            )
    }).catch((err) => {
        // Let a later call retry rather than inheriting a permanent failure.
        dbPromise = null
        throw err
    })

    return dbPromise
}

const requestToPromise = (request) =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })

const withStore = async (storeName, mode, fn) => {
    const db = await openChatDB()
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)

    const result = await fn(store)

    // A readwrite transaction is not durable until it commits, so resolving on
    // the request alone would report success before the write actually landed.
    if (mode === 'readwrite') {
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
            tx.onabort = () => reject(tx.error || new Error('Transaction aborted'))
        })
    }

    return result
}

// --- Conversations ---

export const getAllConversations = async () => {
    const rows = await withStore(CONVERSATION_STORE, 'readonly', (store) =>
        requestToPromise(store.getAll()),
    )

    return (rows || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export const putConversation = async (conversation) => {
    // Vue reactive proxies cannot be structured-cloned, so anything handed to
    // IndexedDB has to be unwrapped first.
    const plain = JSON.parse(JSON.stringify(conversation))

    await withStore(CONVERSATION_STORE, 'readwrite', (store) =>
        requestToPromise(store.put(plain)),
    )

    return conversation
}

export const deleteConversationFromDB = (id) =>
    withStore(CONVERSATION_STORE, 'readwrite', (store) => requestToPromise(store.delete(id)))

// --- Images ---

export const putImage = (record) =>
    withStore(IMAGE_STORE, 'readwrite', (store) => requestToPromise(store.put(record)))

export const getImage = async (id) => {
    if (!id) return null

    return withStore(IMAGE_STORE, 'readonly', (store) => requestToPromise(store.get(id)))
}

// Cursor walk rather than a key lookup: the index is non-unique, so one
// conversation maps to many image records.
const deleteByIndex = async (indexName, keys) => {
    const wanted = (Array.isArray(keys) ? keys : [keys]).filter(Boolean)
    if (!wanted.length) return 0

    const db = await openChatDB()

    return new Promise((resolve, reject) => {
        const tx = db.transaction(IMAGE_STORE, 'readwrite')
        const index = tx.objectStore(IMAGE_STORE).index(indexName)

        let removed = 0

        for (const key of wanted) {
            const request = index.openCursor(IDBKeyRange.only(key))

            request.onsuccess = () => {
                const cursor = request.result
                if (!cursor) return

                cursor.delete()
                removed += 1
                cursor.continue()
            }
        }

        tx.oncomplete = () => resolve(removed)
        tx.onerror = () => reject(tx.error)
    })
}

// A deleted chat takes its generated images with it.
export const deleteImagesForConversation = (conversationId) =>
    deleteByIndex('conversationId', conversationId)

export const deleteImagesForMessages = (messageIds = []) =>
    deleteByIndex('messageId', messageIds)
