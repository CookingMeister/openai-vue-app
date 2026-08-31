// Vector store, ported from section 8 of the vanilla chatapp script.
//
// Separate database from the conversation store: embeddings are large, are
// rebuilt independently of any chat, and are searched on a hot path that
// should not contend with conversation writes.

const EMBED_DB_NAME = 'embeddingsDB'
const EMBED_STORE_NAME = 'vectors'
const EMBED_DB_VERSION = 2

let dbPromise = null

export const openEmbeddingDB = () => {
    if (dbPromise) return dbPromise

    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(EMBED_DB_NAME, EMBED_DB_VERSION)

        req.onupgradeneeded = (event) => {
            const db = event.target.result
            let store

            if (!db.objectStoreNames.contains(EMBED_STORE_NAME)) {
                store = db.createObjectStore(EMBED_STORE_NAME, { keyPath: 'id' })
            } else {
                store = event.target.transaction.objectStore(EMBED_STORE_NAME)
            }

            if (!store.indexNames.contains('bySource')) {
                store.createIndex('bySource', 'metadata.source', { unique: false })
            }
        }

        req.onblocked = () => {
            console.warn('Embedding DB open is blocked by another open connection.')
        }

        req.onsuccess = (event) => {
            const db = event.target.result

            // Another tab upgrading the schema needs this connection to let go,
            // or its upgrade blocks forever.
            db.onversionchange = () => {
                try {
                    db.close()
                } catch {
                    /* already closed */
                }
                dbPromise = null
            }

            resolve(db)
        }

        req.onerror = () => {
            dbPromise = null
            reject(req.error || new Error('Failed to open embedding DB'))
        }
    })

    return dbPromise
}

const requestToPromise = (request, message = 'IndexedDB request failed') =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error || new Error(message))
    })

const waitForTransaction = (tx, message = 'Transaction failed') =>
    new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error || new Error(message))
        tx.onabort = () => reject(tx.error || new Error(message))
    })

const openStore = async (mode) => {
    const db = await openEmbeddingDB()
    const tx = db.transaction(EMBED_STORE_NAME, mode)

    return { tx, store: tx.objectStore(EMBED_STORE_NAME) }
}

export const saveEmbeddings = async (vectors = []) => {
    if (!Array.isArray(vectors) || vectors.length === 0) return 0

    const { tx, store } = await openStore('readwrite')
    const done = waitForTransaction(tx, 'Failed to save embeddings')

    // Issued synchronously so they all share this transaction: an IndexedDB
    // transaction closes as soon as it goes idle, and awaiting between puts
    // would end it early.
    for (const vector of vectors) {
        store.put(vector)
    }

    await done
    return vectors.length
}

const normalizeSourceFilter = (filter) => {
    const raw = filter?.sources

    if (raw == null) return null
    if (!Array.isArray(raw)) return [String(raw)]

    return raw.map((s) => String(s || '').trim()).filter(Boolean)
}

// Narrows at the bySource index rather than reading the whole store and
// filtering in memory -- the store holds every chunk of every document, and a
// search usually wants one or two files.
export const getAllEmbeddings = async (filter = {}) => {
    const { tx, store } = await openStore('readonly')
    const done = waitForTransaction(tx, 'Failed to read embeddings')

    const names = normalizeSourceFilter(filter)

    let result

    if (names === null) {
        result = await requestToPromise(store.getAll(), 'Failed to fetch embeddings')
    } else if (names.length === 0) {
        // An explicit empty list means "search nothing", not "search everything".
        result = []
    } else {
        const index = store.index('bySource')

        const batches = await Promise.all(
            names.map((name) =>
                requestToPromise(
                    index.getAll(IDBKeyRange.only(name)),
                    `Failed to fetch embeddings for ${name}`,
                ),
            ),
        )

        result = batches.flat()
    }

    await done
    return result || []
}

// Just the source names, without dragging every vector into memory to find
// them.
export const getEmbeddedSources = async () => {
    const { tx, store } = await openStore('readonly')
    const done = waitForTransaction(tx, 'Failed to read embedding sources')

    const index = store.index('bySource')
    const names = new Set()

    await new Promise((resolve, reject) => {
        // openKeyCursor reads index keys only -- no record bodies, so this does
        // not deserialize a single embedding.
        const request = index.openKeyCursor()

        request.onsuccess = () => {
            const cursor = request.result

            if (!cursor) {
                resolve()
                return
            }

            names.add(String(cursor.key))
            cursor.continue()
        }

        request.onerror = () => reject(request.error)
    })

    await done
    return [...names].sort()
}

export const deleteEmbeddingsForSource = async (sourceName) => {
    if (!sourceName) return 0

    const { tx, store } = await openStore('readwrite')
    const done = waitForTransaction(tx, 'Failed to delete embeddings')

    const index = store.index('bySource')
    let removed = 0

    await new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.only(sourceName))

        request.onsuccess = () => {
            const cursor = request.result

            if (!cursor) {
                resolve()
                return
            }

            cursor.delete()
            removed += 1
            cursor.continue()
        }

        request.onerror = () => reject(request.error)
    })

    await done
    return removed
}

export const clearAllEmbeddings = async () => {
    const { tx, store } = await openStore('readwrite')
    const done = waitForTransaction(tx, 'Failed to clear embeddings')

    const count = await requestToPromise(store.count())
    store.clear()

    await done
    return count
}
