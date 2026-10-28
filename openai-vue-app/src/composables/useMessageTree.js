import { reactive, ref, computed } from 'vue'

import { ROOT_ID, TREE_VERSION, nextNodeId, conversationTree } from '@/utils/messageTree.js'

// The live message tree for the open conversation.
//
// Nodes are the same objects the transcript renders and the stream writes into,
// so a delta arriving on a placeholder lands in the tree with no copying back.
// `path` is the selected root-to-head branch and is what App.vue calls
// `messages`; everything off that path stays in `nodes`, invisible until the
// branch arrows walk back onto it.
//
// Module-level state, like the other composables here: there is one open
// conversation, and every caller has to see the same tree.

const nodes = reactive({})
const headId = ref(ROOT_ID)

const makeRoot = () => ({ id: ROOT_ID, parentId: null, children: [], activeChild: null })

export const resetTree = () => {
    for (const key of Object.keys(nodes)) delete nodes[key]
    nodes[ROOT_ID] = makeRoot()
    headId.value = ROOT_ID
}

resetTree()

const nodeAt = (id) => (id == null ? null : nodes[String(id)] || null)

// Root -> head, root itself excluded. Derived by walking up from the head, so
// it is always a real chain of parents rather than a guess from pointers that
// an edit elsewhere could have left stale.
export const path = computed(() => {
    const out = []
    const seen = new Set()

    let current = nodeAt(headId.value)

    while (current && current.id !== ROOT_ID && !seen.has(current.id)) {
        seen.add(current.id)
        out.push(current)
        current = nodeAt(current.parentId)
    }

    return out.reverse()
})

export const allNodes = () => Object.values(nodes).filter((n) => n.id !== ROOT_ID)

// Points every ancestor at the child the head sits under, so a later descent
// from any of them comes back to this branch.
export const setHead = (id) => {
    let current = nodeAt(id)
    if (!current) return

    headId.value = current.id

    const seen = new Set()

    while (current && !seen.has(current.id)) {
        seen.add(current.id)

        const parent = nodeAt(current.parentId)
        if (!parent) break

        parent.activeChild = current.id
        current = parent
    }
}

// The leaf this subtree was last left on.
const descendToLeaf = (id) => {
    let current = nodeAt(id)
    if (!current) return ROOT_ID

    const seen = new Set()

    while (current.children.length && !seen.has(current.id)) {
        seen.add(current.id)

        const next = current.children.some((c) => String(c) === String(current.activeChild))
            ? current.activeChild
            : current.children[current.children.length - 1]

        const child = nodeAt(next)
        if (!child) break

        current.activeChild = child.id
        current = child
    }

    return current.id
}

// Adds a node under `parentId` -- the head by default, which extends the
// current branch, or an existing node parent, which forks a new arm beside it.
// Returns the reactive node so the caller can stream into it.
export const appendNode = (data, parentId = headId.value) => {
    const parent = nodeAt(parentId) || nodes[ROOT_ID]
    const id = data.id ?? nextNodeId()

    nodes[String(id)] = {
        ...data,
        id,
        parentId: parent.id,
        children: [],
        activeChild: null,
    }

    parent.children.push(id)
    setHead(id)

    return nodes[String(id)]
}

export const getNode = (id) => nodeAt(id)

// The nearest ancestor with this role -- the prompt an answer replies to.
export const findAncestor = (id, role) => {
    let current = nodeAt(nodeAt(id)?.parentId)

    while (current && current.id !== ROOT_ID) {
        if (current.role === role) return current
        current = nodeAt(current.parentId)
    }

    return null
}

const siblingsOf = (id) => {
    const parent = nodeAt(nodeAt(id)?.parentId)
    return parent ? parent.children : []
}

// 1-based, for the "2 of 3" the branch switcher shows.
export const branchIndex = (id) => siblingsOf(id).indexOf(nodeAt(id)?.id) + 1
export const branchCount = (id) => siblingsOf(id).length

// Moves to the sibling `delta` away and follows that arm down to its leaf, so
// the whole conversation below the fork swaps over, not just the one bubble.
export const selectBranch = (id, delta) => {
    const siblings = siblingsOf(id)
    const at = siblings.indexOf(nodeAt(id)?.id)

    if (at === -1 || siblings.length < 2) return null

    const next = siblings[(at + delta + siblings.length) % siblings.length]

    setHead(descendToLeaf(next))
    return next
}

// A node and everything hanging off it, across every branch below it. Used to
// size a delete before confirming it, and to cascade the deletes that follow.
export const subtreeOf = (id, out = []) => {
    const node = nodeAt(id)
    if (!node) return out

    out.push(node)
    for (const childId of [...node.children]) subtreeOf(childId, out)

    return out
}

// Drops a node and everything under it, returning what went so the caller can
// cascade its own deletes. The head only moves if it was inside the removed
// subtree: it falls back to the sibling taking that branch place in the list,
// or to the parent when there is no sibling left.
export const deleteSubtree = (id) => {
    const node = nodeAt(id)
    if (!node || node.id === ROOT_ID) return []

    const parent = nodeAt(node.parentId)
    const removed = subtreeOf(node.id)
    const removedIds = new Set(removed.map((n) => String(n.id)))

    if (parent) {
        const at = parent.children.indexOf(node.id)
        if (at !== -1) parent.children.splice(at, 1)

        if (String(parent.activeChild) === String(node.id)) {
            parent.activeChild =
                parent.children[at] ?? parent.children[parent.children.length - 1] ?? null
        }
    }

    for (const gone of removed) delete nodes[String(gone.id)]

    if (removedIds.has(String(headId.value))) {
        setHead(parent ? descendToLeaf(parent.id) : ROOT_ID)
    }

    return removed
}

// --- Persistence ---

// What goes to IndexedDB. Rendered html, blob urls and the streaming flag are
// derived or session-scoped, so only the structure and the source text are
// written.
export const serializeTree = () => ({
    version: TREE_VERSION,
    headId: headId.value === ROOT_ID ? null : headId.value,
    nodes: allNodes().map((node) => ({
        id: node.id,
        parentId: node.parentId === ROOT_ID ? null : node.parentId,
        children: [...node.children],
        activeChild: node.activeChild,
        // Live nodes carry the on-screen role, but a node hydrated without a
        // decorator still carries the stored one, so both spellings map here.
        role: node.role === 'bot' || node.role === 'assistant' ? 'assistant' : 'user',
        content: node.content,
        timestamp: node.timestamp,
        ...(node.stats ? { stats: node.stats } : {}),
        // op/instruction/sourceId are what it takes to run the request again,
        // so Regenerate still repeats the right endpoint in a later session.
        ...(node.imageId
            ? {
                  image: {
                      id: node.imageId,
                      prompt: node.imagePrompt || '',
                      ...(node.imageOp ? { op: node.imageOp } : {}),
                      ...(node.imageInstruction ? { instruction: node.imageInstruction } : {}),
                      ...(node.imageSourceId ? { sourceId: node.imageSourceId } : {}),
                  },
              }
            : {}),
    })),
})

// Rebuilds the live tree from a stored conversation, in either shape: a flat
// message array reads back as a single unbranched trunk.
// `decorate` supplies the display-only fields the store does not carry.
export const hydrateTree = (conv, decorate = () => ({})) => {
    resetTree()

    const stored = conversationTree(conv)
    if (!stored.nodes?.length) return []

    const known = new Set(stored.nodes.map((n) => String(n.id)))

    for (const node of stored.nodes) {
        const parentId =
            node.parentId != null && known.has(String(node.parentId)) ? node.parentId : ROOT_ID

        nodes[String(node.id)] = {
            ...node,
            ...decorate(node),
            id: node.id,
            parentId,
            // Rebuilt below from what actually survived, so a record that lost
            // a node to a failed write cannot leave a dangling child id.
            children: [],
            activeChild: node.activeChild,
        }
    }

    // Restores sibling order, which is what the branch numbering counts.
    for (const node of stored.nodes) {
        const live = nodes[String(node.id)]
        const parent = nodeAt(live.parentId)
        if (parent) parent.children.push(live.id)
    }

    for (const node of allNodes()) {
        if (!node.children.some((c) => String(c) === String(node.activeChild))) {
            node.activeChild = node.children[node.children.length - 1] ?? null
        }
    }

    setHead(known.has(String(stored.headId)) ? stored.headId : descendToLeaf(ROOT_ID))

    return allNodes()
}

export const useMessageTree = () => ({
    path,
    headId,
    allNodes,
    appendNode,
    getNode,
    findAncestor,
    branchIndex,
    branchCount,
    selectBranch,
    subtreeOf,
    deleteSubtree,
    serializeTree,
    hydrateTree,
    resetTree,
    setHead,
})

export default useMessageTree
