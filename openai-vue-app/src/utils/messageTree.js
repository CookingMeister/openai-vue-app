// The stored shape of a branching conversation.
//
// A conversation is a tree of message nodes rather than a list. Every node
// names its parent, keeps its children in the order they were created, and
// remembers which child was last followed (`activeChild`). One pointer per
// conversation -- `headId` -- names the leaf the user is currently looking at,
// and the path from the root down to it is the "selected path": what the
// transcript renders and what gets rebuilt into the request context.
//
// Nothing here is reactive. This module owns the persisted shape and the pure
// walks over it; the live tree the app edits lives in composables/useMessageTree.js.

export const ROOT_ID = '__root__'
export const TREE_VERSION = 1

let seq = 0

// Unique within a session and stable once written. A node read from a flat
// message list keeps its existing id -- a number, which image records key off --
// rather than being normalised to this form.
export const nextNodeId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`

const indexById = (nodes = []) => {
    const map = new Map()
    for (const node of nodes) map.set(String(node.id), node)
    return map
}

// Walks down from the root following `activeChild`, which is how a branch
// selection is remembered: re-entering a fork lands on the arm last viewed.
const descendStored = (map, startId, roots) => {
    let currentId = startId

    if (currentId == null) {
        const first = roots[roots.length - 1]
        if (first == null) return null
        currentId = first
    }

    let node = map.get(String(currentId))

    while (node) {
        const children = node.children || []
        if (!children.length) break

        const next = children.includes(node.activeChild)
            ? node.activeChild
            : children[children.length - 1]

        node = map.get(String(next))
    }

    return node ? String(node.id) : null
}

const rootIds = (nodes = []) =>
    nodes.filter((n) => n.parentId == null || n.parentId === ROOT_ID).map((n) => String(n.id))

// Root -> head. Walking up from the head is authoritative: it cannot disagree
// with itself the way a chain of `activeChild` pointers could if one were left
// stale by an edit.
export const pathFromStoredTree = (tree) => {
    if (!tree?.nodes?.length) return []

    const map = indexById(tree.nodes)
    const roots = rootIds(tree.nodes)

    let currentId = tree.headId != null && map.has(String(tree.headId))
        ? String(tree.headId)
        : descendStored(map, null, roots)

    const out = []
    const seen = new Set()

    while (currentId && map.has(currentId) && !seen.has(currentId)) {
        seen.add(currentId)

        const node = map.get(currentId)
        out.push(node)

        currentId = node.parentId == null || node.parentId === ROOT_ID
            ? null
            : String(node.parentId)
    }

    return out.reverse()
}

// A conversation stored as a flat `messages` array reads as a tree with a single
// unbranched trunk, so no history is lost or reordered.
export const linearToTree = (messages = []) => {
    const nodes = messages.map((msg) => ({
        ...msg,
        id: msg.id ?? nextNodeId(),
        parentId: null,
        children: [],
        activeChild: null,
    }))

    for (let i = 1; i < nodes.length; i++) {
        nodes[i].parentId = nodes[i - 1].id
        nodes[i - 1].children = [nodes[i].id]
        nodes[i - 1].activeChild = nodes[i].id
    }

    return {
        version: TREE_VERSION,
        headId: nodes.length ? nodes[nodes.length - 1].id : null,
        nodes,
    }
}

// The tree of a stored conversation, whichever shape it was written in.
export const conversationTree = (conv) =>
    conv?.tree?.nodes ? conv.tree : linearToTree(conv?.messages || [])

// The selected path of a stored conversation, as a flat message list. Title
// generation and the sidebar's fallback title both read a conversation this
// way without caring that it branches.
export const conversationPathMessages = (conv) => pathFromStoredTree(conversationTree(conv))
