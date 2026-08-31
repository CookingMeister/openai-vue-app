// Citation instructions, ported verbatim from the vanilla chatapp script.
//
// The 0.40 weak-match figure below assumes minSim around 0.35 and
// chunkingTokens around 500. Both live in the RAG settings modal, so if those
// move, move this with them: with larger chunks every score drifts down and a
// fixed 0.40 would have the model searching on every turn.

export const CONTEXT_INSTRUCTIONS = {
    base: `### Task:
Respond to the user query using the provided context, incorporating inline citations in the format [id] when referencing specific retrieved snippets.

### Guidelines:
- If you don't know the answer, clearly state that.
- If uncertain, ask the user for clarification.
- Respond in the same language as the user's query.
- If the context is unreadable or of poor quality, inform the user and provide the best possible answer.
- If the answer isn't present in the context but you possess the knowledge, explain this to the user and provide the answer using your own understanding.
- **Only include inline citations using [id] when referencing specific retrieved snippets with provided IDs.**
- Do not cite general knowledge or document background without a snippet ID.
- Ensure citations are concise and directly related to the information provided.
- If the context does not answer the question, call the search_documents tool with your own rephrased query rather than guessing or answering from general knowledge about the user's files.`,

    docOnly: `### Additional Context Notes:
- The uploaded document provides background context and is referenced contextually as "the document" or "the uploaded file."
- Do not use [id] format for document citations (it has no snippet IDs).`,

    ragOnly: `### Additional Context Notes:
- Retrieved snippets are ranked by relevance (similarity score) and labeled with IDs [1], [2], etc.
- Each snippet includes its source file and chunk index for reference.
- Only cite using [id] when directly referencing a specific snippet.
- Higher-ranked snippets (lower IDs) are more relevant to your query.
- A score measures how closely a snippet matched the query, not whether it answers it. A snippet can score well and still be irrelevant.
- These snippets were retrieved using the user's own wording, which is often a poor search query -- especially for short or pronoun-heavy follow-ups. Your own phrasing will usually retrieve better.
- If no snippet directly addresses the question, or the best score is below about 0.40, call search_documents with a rephrased query before answering.
- Do not answer from marginal snippets, and do not state that something is absent from the user's documents without searching first.
- One rephrased search is enough. If that also comes back empty, say plainly that the documents do not appear to cover it.`,

    hybrid: `### Additional Context Notes:
- Uploaded document: Reference contextually as "the document" (no [id] citations--it's background context).
- Retrieved snippets: Cite as [1], [2], etc. when referencing specific relevant snippets with their IDs.
- Each snippet includes its source file and chunk index.
- Prefer snippet citations [id] for specific facts; use document for general background.
- If sources conflict, acknowledge both perspectives.
- If neither the document nor the snippets answer the question, or the best snippet score is below about 0.40, call search_documents with a rephrased query before answering.
- One rephrased search is enough. If that also comes back empty, say plainly that the sources do not appear to cover it.`,
}

export default CONTEXT_INSTRUCTIONS
