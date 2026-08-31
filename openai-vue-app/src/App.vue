<template>
    <div class="d-flex vh-100 app-shell">
        <aside :class="['chat-sidebar', sidebarOpen ? 'is-open' : 'closed']">
            <div class="sidebar-top">
                <button class="btn btn-outline-secondary sidebar-toggle-btn" type="button"
                    aria-label="Toggle Sidebar" :aria-expanded="String(sidebarOpen)"
                    v-bs-tooltip="sidebarOpen ? '' : 'Toggle Sidebar'"
                    @click="sidebarOpen = !sidebarOpen">
                    <i class="bi bi-list" aria-hidden="true"></i>
                </button>

                <div class="d-flex align-items-center sidebar-new-chat-row">
                    <button class="btn btn-outline-secondary new-chat-btn" type="button"
                        aria-label="New Chat" v-bs-tooltip="sidebarOpen ? '' : 'New Chat'"
                        @click="onNewChat" :disabled="isStreaming">
                        <i class="bi bi-plus-lg" aria-hidden="true"></i>
                    </button>
                    <span class="sidebar-title-text">New Chat</span>
                </div>
            </div>

            <div class="sidebar-scroll-area">
                <div class="sidebar-chats-title">
                    <i class="bi bi-chat-left-text sidebar-title-icon"></i>
                    <span class="sidebar-title-text">Chats</span>
                </div>

                <div class="sidebar-list">
                    <p v-if="!conversations.length" class="conversation-empty mb-0">No saved chats yet.</p>

                    <div v-for="conv in conversations" :key="conv.id"
                        :class="['conversation-item', conv.id === currentConversationId ? 'active' : '']">
                        <button class="conversation-main" type="button" @click="onOpenConversation(conv.id)">
                            <span class="conversation-title">{{ conv.title }}</span>
                        </button>
                        <div class="conversation-menu-wrap dropdown">
                            <button class="conversation-menu-btn" type="button" data-bs-toggle="dropdown"
                                data-bs-auto-close="true" aria-expanded="false" aria-label="Conversation actions">
                                <i class="bi bi-three-dots" aria-hidden="true"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow">
                                <li>
                                    <button class="dropdown-item" type="button" @click="onRenameConversation(conv)">
                                        <i class="bi bi-pencil me-2"></i>Rename
                                    </button>
                                </li>
                                <li>
                                    <button class="dropdown-item dropdown-item-danger" type="button"
                                        @click="onDeleteConversation(conv)">
                                        <i class="bi bi-trash me-2"></i>Delete
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sidebar-bottom">
                <button class="btn btn-outline-secondary sidebar-settings-btn" type="button"
                    aria-label="RAG Settings" v-bs-tooltip="'RAG Settings'" @click="openRagSettings">
                    <i class="bi bi-gear" aria-hidden="true"></i>
                </button>
            </div>
        </aside>

        <div v-if="sidebarOpen" class="sidebar-backdrop d-lg-none" @click="sidebarOpen = false"></div>

        <div class="chat-main d-flex flex-column flex-fill min-w-0">
        <header class="app-header">
            <div class="chat-wrapper">
                <div class="d-flex justify-content-between align-items-center p-3">
                    <div class="d-flex align-items-center gap-2">
                        <div v-if="modelsLoaded" class="dropdown model-control">
                            <button type="button" class="btn model-control-btn" data-bs-toggle="dropdown"
                                data-bs-auto-close="true" aria-expanded="false" :disabled="isStreaming">
                                <span class="model-control-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                        fill="currentColor" class="bi bi-openai" viewBox="0 0 16 16">
                                        <path
                                            d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
                                    </svg>
                                </span>

                                <span class="model-control-copy">
                                    <span class="model-control-title">{{ activeModel?.label }}</span>
                                    <span class="model-control-meta">{{ modelMetaLine }}</span>
                                </span>

                                <i class="bi bi-chevron-down model-control-chevron"></i>
                            </button>

                            <div class="dropdown-menu dropdown-menu-start shadow-sm model-control-menu">
                                <div class="model-control-section">
                                    <div class="model-control-section-title">Models</div>
                                    <div class="model-options-list">
                                        <button v-for="m in models" :key="m.key" type="button"
                                            :class="['model-option', m.key === currentModelKey ? 'active' : '']"
                                            @click="setModel(m.key)">
                                            <span class="model-option-title">{{ m.label }}</span>
                                            <i v-if="m.key === currentModelKey"
                                                class="bi bi-check2 model-option-check"></i>
                                        </button>
                                    </div>
                                </div>

                                <template v-if="supportsReasoning">
                                    <div class="model-control-divider"></div>
                                    <div class="model-control-section">
                                        <div class="d-flex align-items-center justify-content-between mb-2">
                                            <div class="model-control-section-title mb-0">Reasoning</div>
                                            <span class="model-control-hint">Per model</span>
                                        </div>
                                        <div class="reasoning-chip-group">
                                            <button v-for="opt in reasoningOptions" :key="opt" type="button"
                                                :class="['reasoning-chip', opt === activeReasoning ? 'active' : '']"
                                                @click="setReasoning(opt)">
                                                {{ reasoningLabel(opt) }}
                                            </button>
                                        </div>
                                    </div>
                                </template>

                                <div class="model-control-divider"></div>

                                <div class="model-control-footer">
                                    <div class="model-stat-card">
                                        <div class="model-stat-content">
                                            <span class="model-stat-label">Context</span>
                                            <span class="model-stat-value">
                                                {{ formatCompactTokens(activeModel?.contextWindow || 0) }}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="model-stat-card">
                                        <div class="model-stat-content">
                                            <span class="model-stat-label">Output</span>
                                            <span class="model-stat-value">
                                                {{ formatCompactTokens(activeModel?.defaultMax || 0) }}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="model-stat-card">
                                        <div class="model-stat-content">
                                            <span class="model-stat-label">Reasoning</span>
                                            <span class="model-stat-value">
                                                {{ activeReasoning ? reasoningLabel(activeReasoning) : '--' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex align-items-center gap-3">
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
                        <div :class="['message-col', msg.role === 'user' ? 'user-col' : 'bot-col']">
                            <div
                                :class="['message-bubble', msg.role === 'user' ? 'user-message' : 'bot-message', 'p-3', 'rounded', msg.streaming ? 'streaming' : '']">
                                <template v-if="msg.role === 'bot'">
                                    <div>
                                        <div v-if="msg.isImage && msg.imageUrl"
                                            class="img-block-wrapper position-relative d-inline-block mb-2">
                                            <img :src="msg.imageUrl"
                                                :alt="msg.imagePrompt || ''" class="img-fluid rounded shadow-sm"
                                                style="max-width: 100%; border-radius: 7px" />

                                            <!-- Refine/Iterate button (left of download button): -->
                                            <button class="btn btn-outline-secondary img-download-btn px-2"
                                                style="position: absolute; top: 8px; right: 48px; opacity: 0.8; z-index: 21;"
                                                @click="handleIterateImage(msg.imageInfo)" :disabled="!msg.imageUrl"
                                                v-bs-tooltip="'Make a Variation'">
                                                <i class="bi bi-arrow-repeat"></i>
                                            </button>

                                            <!-- Download button: -->
                                            <button class="btn btn-sm btn-outline-secondary img-download-btn "
                                                style="position: absolute; top: 8px; right: 8px; opacity: 0.8; z-index: 20; padding-bottom: 4px;"
                                                @click="downloadImage(msg.imageUrl, msg.imagePrompt)"
                                                v-bs-tooltip="'Download image'">
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
                                        <template v-else-if="msg.streaming">
                                            <div v-if="!msg.content" class="message-content small">
                                                <div class="typing-dots" role="status" aria-label="Waiting for response">
                                                    <span class="typing-dot" aria-hidden="true"></span>
                                                    <span class="typing-dot" aria-hidden="true"></span>
                                                    <span class="typing-dot" aria-hidden="true"></span>
                                                </div>
                                            </div>
                                            <template v-else>
                                                <div class="typing-shimmer" aria-hidden="true"></div>
                                                <div class="message-content small"
                                                    v-stream-markdown="msg.content"></div>
                                            </template>
                                        </template>
                                        <div v-else class="message-content small" v-html="msg.html" v-code-enhance></div>
                                        <div v-if="msg.citations?.length" class="response-citations small">
                                            <span class="citations-label">Sources:</span>
                                            <span v-for="c in msg.citations" :key="c.idx" class="citation-chip"
                                                v-bs-tooltip="`chunk ${c.chunkIndex} - similarity ${c.similarity.toFixed(3)}`">
                                                [{{ c.idx }}] {{ c.source }}
                                            </span>
                                        </div>
                                        <div v-if="!msg.streaming && !msg.isWelcome" class="message-actions">
                                            <button type="button" class="msg-action"
                                                v-bs-tooltip="{ title: 'Delete this exchange', placement: 'bottom' }" :disabled="isStreaming"
                                                @click="onDeleteMessage(msg)">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                            <button v-if="msg.stats" type="button" class="msg-action"
                                                data-stats-trigger v-bs-tooltip="{ title: 'Response stats', placement: 'bottom' }" aria-label="Response stats"
                                                @click.stop="toggleStats(msg)">
                                                <i class="bi bi-info-circle"></i>
                                            </button>
                                            <button type="button" class="msg-action" v-bs-tooltip="{ title: 'Copy answer', placement: 'bottom' }"
                                                @click="onCopyMessage(msg)">
                                                <i :class="copiedMessageId === msg.id ? 'bi bi-check2' : 'bi bi-copy'"></i>
                                            </button>
                                            <button type="button" class="msg-action" v-bs-tooltip="{ title: 'Regenerate', placement: 'bottom' }"
                                                :disabled="isStreaming" @click="onRetryMessage(msg)">
                                                <i class="bi bi-arrow-clockwise"></i>
                                            </button>
                                            <div v-if="openStatsFor === msg.id && msg.stats" class="stats-popover"
                                                @click.stop>
                                                <div class="stats-pop-title">Response stats</div>
                                                <template v-for="(group, gi) in statsRows(msg.stats)" :key="gi">
                                                    <div v-if="gi" class="stats-pop-divider"></div>
                                                    <div v-for="row in group" :key="row.label" class="stats-pop-row">
                                                        <span class="stats-pop-label">{{ row.label }}</span>
                                                        <span :class="['stats-pop-value', row.muted ? 'muted' : '']">{{
                                                            row.value }}</span>
                                                    </div>
                                                </template>
                                            </div>
                                        </div>
                                        <div class="message-timestamp" v-bs-tooltip="longTimestamp(msg.timestamp)">{{
                                            timestamp(msg.timestamp) }}</div>
                                    </div>
                                </template>
                                <template v-else>
                                    <div v-if="editingMessageId === msg.id" class="edit-prompt-box">
                                        <textarea class="form-control form-control-sm" rows="3" v-model="editDraft"
                                            @keydown.esc.prevent="cancelEditPrompt"
                                            @keydown.enter.exact.prevent="confirmEditPrompt(msg)"></textarea>
                                        <div class="d-flex justify-content-end gap-2 mt-2">
                                            <button type="button" class="btn btn-sm btn-outline-secondary"
                                                @click="cancelEditPrompt">Cancel</button>
                                            <button type="button" class="btn btn-sm btn-primary"
                                                :disabled="!editDraft.trim()" @click="confirmEditPrompt(msg)">
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                    <template v-else>
                                        <div class="message-content small" style="white-space: pre-wrap">
                                            {{ msg.content }}
                                        </div>
                                    </template>
                                </template>
                            </div>
                            <div v-if="msg.role === 'user' && editingMessageId !== msg.id" class="message-actions user-actions">
                                <button type="button" class="msg-action" v-bs-tooltip="{ title: 'Copy prompt', placement: 'bottom' }"
                                    @click="onCopyMessage(msg)">
                                    <i :class="copiedMessageId === msg.id ? 'bi bi-check2' : 'bi bi-copy'"></i>
                                </button>
                                <button type="button" class="msg-action" v-bs-tooltip="{ title: 'Edit and resend', placement: 'bottom' }"
                                    :disabled="isStreaming" @click="beginEditPrompt(msg)">
                                    <i class="bi bi-pencil"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <footer class="app-header">
            <div class="chat-wrapper p-3">
                <div :class="['input-area', 'rounded', 'p-3', activePromptMode ? 'prompt-mode-active' : '']">
                    <div class="row g-2 align-items-center flex-nowrap">
                        <!-- LEFT: actions -->
                        <div class="col-auto">
                            <div class="dropdown dropup position-relative d-inline-block">
                                <button
                                    class="btn btn-outline-secondary d-flex align-items-center justify-content-center action-control-btn control-h-36"
                                    data-bs-toggle="dropdown" data-bs-display="static" data-bs-auto-close="true"
                                    type="button" aria-label="Open control actions">
                                    <i class="bi bi-plus-lg" aria-hidden="true"></i>
                                </button>
                                <ul class="dropdown-menu cursor-pointer shadow">
                                    <li>
                                        <button class="dropdown-item d-flex align-items-center justify-content-between"
                                            type="button" :aria-pressed="String(isWebSearchMode)"
                                            @click="togglePromptMode('web-search')">
                                            <span class="d-flex align-items-center">
                                                <i class="bi bi-globe me-2"></i>
                                                <span class="px-1">Web Search</span>
                                            </span>
                                            <i v-if="isWebSearchMode" class="bi bi-check2 websearch-check"></i>
                                        </button>
                                    </li>
                                    <li><hr class="dropdown-divider" /></li>
                                    <li>
                                        <button class="dropdown-item d-flex align-items-center justify-content-between"
                                            type="button" :aria-pressed="String(isImageMode)"
                                            @click="togglePromptMode('image')">
                                            <span class="d-flex align-items-center">
                                                <i class="bi bi-image me-2"></i>
                                                <span class="px-1">Create image</span>
                                            </span>
                                            <i v-if="isImageMode" class="bi bi-check2 websearch-check"></i>
                                        </button>
                                    </li>
                                    <li><hr class="dropdown-divider" /></li>
                                    <li>
                                        <button class="dropdown-item" type="button"
                                            @click="contextFileInput?.click()">
                                            <i class="bi bi-journal-text me-2"></i>Add file as context
                                        </button>
                                    </li>
                                    <li>
                                        <button class="dropdown-item" type="button" @click="embedFileInput?.click()">
                                            <i class="bi bi-file-earmark-arrow-up me-2"></i>Add files for embeddings
                                        </button>
                                    </li>
                                    <li><hr class="dropdown-divider" /></li>
                                    <li>
                                        <button class="dropdown-item dropdown-item-danger" type="button"
                                            @click="onClearDocContext">
                                            <i class="bi bi-x-circle me-2"></i>Delete file context
                                        </button>
                                    </li>
                                    <li>
                                        <button class="dropdown-item dropdown-item-danger" type="button"
                                            :disabled="ragBusy" @click="onDeleteAllEmbeddings">
                                            <i class="bi bi-trash3 me-2"></i>Delete all embeddings
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            <div v-if="activePromptMode" class="mode-pills">
                                <span class="pill" :data-kind="activePromptMode">
                                    <span class="pill-icon">
                                        <i :class="isImageMode ? 'bi bi-image' : 'bi bi-globe'"></i>
                                    </span>
                                    <span class="pill-label">{{ isImageMode ? 'Image' : 'Web Search' }}</span>
                                    <button type="button" class="close"
                                        :aria-label="isImageMode ? 'Remove image' : 'Remove web search'"
                                        @click="clearPromptMode">&times;</button>
                                </span>
                            </div>

                            <input ref="contextFileInput" type="file" class="d-none" :accept="docAccept"
                                @change="onPickContextFile" />
                            <input ref="embedFileInput" type="file" class="d-none" multiple :accept="docAccept"
                                @change="onPickEmbedFiles" />
                        </div>

                        <!-- CENTER: textarea -->
                        <div class="col">
                            <label for="promptInput" class="visually-hidden">Message</label>
                            <textarea ref="promptInput" id="promptInput"
                                class="form-control message-input w-100"
                                :placeholder="promptPlaceholder" rows="1"
                                v-model="input" @input="autoResize" @keydown="onInputKeydown"></textarea>
                        </div>

                        <!-- RIGHT: context widget + send -->
                        <div class="col-auto d-flex align-items-center gap-2">
                            <div class="context-widget position-relative" :class="contextLevel"
                                role="button" tabindex="0" aria-label="Context estimate"
                                v-bs-tooltip="`${formatCompactTokens(contextUsage.plannedTotal)} of ${formatCompactTokens(contextUsage.contextWindow)} tokens`"
                                @click="showContextDetail = !showContextDetail"
                                @keydown.enter.prevent="showContextDetail = !showContextDetail">
                                <div class="context-widget-bar">
                                    <div class="context-widget-bar-fill"
                                        :style="{ width: contextUsage.percent.toFixed(1) + '%' }"></div>
                                </div>
                                <div class="context-widget-body">
                                    <span class="context-widget-text">
                                        {{ formatCompactTokens(contextUsage.plannedTotal) }} /
                                        {{ formatCompactTokens(contextUsage.contextWindow) }}
                                    </span>
                                </div>

                                <div v-if="showContextDetail" class="context-pop" @click.stop>
                                    <div class="context-pop-title">Context Estimate</div>
                                    <div class="context-pop-divider"></div>
                                    <div class="context-pop-row">
                                        <span>History</span><span>{{ contextUsage.historyTokens.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row">
                                        <span>System prompt</span><span>{{ contextUsage.systemPromptTokens.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row">
                                        <span>Draft</span><span>{{ contextUsage.draftTokens.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row">
                                        <span>Doc context</span><span>{{ contextUsage.docTokens.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row">
                                        <span>RAG</span><span>{{ contextUsage.ragTokens.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row muted">
                                        <span>Overhead</span><span>{{ contextUsage.wrapperTokens.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-divider"></div>
                                    <div class="context-pop-row">
                                        <span>Estimated input</span><span>{{ contextUsage.estimatedInput.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row">
                                        <span>Reserved output</span><span>{{ contextUsage.reservedOutput.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row">
                                        <span>Planned total</span><span>{{ contextUsage.plannedTotal.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row">
                                        <span>Context window</span><span>{{ contextUsage.contextWindow.toLocaleString() }}</span>
                                    </div>
                                    <div class="context-pop-row">
                                        <span>Headroom</span><span>{{ contextUsage.remaining.toLocaleString() }}</span>
                                    </div>
                                    <template v-if="contextUsage.historyDropped > 0">
                                        <div class="context-pop-divider"></div>
                                        <div class="context-pop-row muted">
                                            <span>Older msgs not sent</span><span>{{ contextUsage.historyDropped }}</span>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <button id="sendBtn"
                                :disabled="!isStreaming && (isSending || input.trim().length < 2)"
                                :class="['btn', 'd-flex', 'align-items-center', 'gap-1', 'control-h-36', isStreaming ? 'btn-danger' : 'btn-primary']"
                                v-bs-tooltip="isStreaming ? 'Stop (abort current response)' : ''"
                                @click="onSendOrStop">
                                <i :class="isStreaming ? 'bi bi-stop-fill' : 'bi bi-send'"></i>
                                <span>{{ isStreaming ? 'Stop' : 'Send' }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-2 gap-2 flex-wrap">
                    <small id="statusText" style="color: var(--text-muted)">
                        {{ ragBusy ? ragProgress : status }}
                    </small>
                    <small id="docStatus" style="color: var(--text-muted)">
                        <span v-if="docContext" class="me-2">
                            <i class="bi bi-journal-text"></i> {{ docName }}
                        </span>
                        <span v-if="hasEmbeddings">
                            <i class="bi bi-database"></i>
                            {{ enabledSources.length }}/{{ ragSources.length }} embedded
                        </span>
                    </small>
                    <small id="messageCount" style="color: var(--text-muted)">{{ messages.length }} messages</small>
                </div>
            </div>
        </footer>
        </div>

        <div v-if="showIterateModal" class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5)"
            id="iterateImageModal" tabindex="-1" aria-labelledby="iterateImageModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="iterateImageModalLabel">
                            <i class="bi bi-magic me-1"></i> Refine Image
                        </h5>
                        <button type="button" class="btn-close btn-close-white" @click="showIterateModal = false"
                            aria-label="Close" tabindex="-1"></button>
                    </div>
                    <div class="modal-body">
                        <input type="text" placeholder="Iterate / refine this image" class="form-control"
                            v-model="iterateInstruction" @keydown.enter.prevent="handleConfirmEdit" autocomplete="off"
                            spellcheck="true" autofocus />
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="cancelIterateBtn" class="btn btn-outline-secondary btn-modal-cancel"
                            @click="showIterateModal = false">Cancel</button>
                        <button type="button" id="confirmIterateBtn" class="btn btn-primary" @click="handleConfirmEdit">
                            <i class="bi bi-arrow-repeat"></i> Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

        <div v-if="showRenameModal" class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5)"
            tabindex="-1" aria-labelledby="renameChatLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="renameChatLabel">
                            <i class="bi bi-pencil me-1"></i> Rename chat
                        </h5>
                        <button type="button" class="btn-close btn-close-white" @click="showRenameModal = false"
                            aria-label="Close" tabindex="-1"></button>
                    </div>
                    <div class="modal-body">
                        <input type="text" class="form-control" v-model="renameDraft" maxlength="80"
                            @keydown.enter.prevent="confirmRename" autocomplete="off" autofocus />
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="showRenameModal = false">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-primary" :disabled="!renameDraft.trim()"
                            @click="confirmRename">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showRagSettings" id="ragSettingsModal" class="modal fade show d-block"
            style="background-color: rgba(0,0,0,0.5)"
            tabindex="-1" aria-labelledby="ragSettingsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <form class="modal-content" @submit.prevent="applyRagSettings">
                    <div class="modal-header">
                        <h6 class="modal-title" id="ragSettingsModalLabel">RAG Settings</h6>
                        <button type="button" class="btn-close btn-close-white" @click="showRagSettings = false"
                            aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row gy-2 gx-3">
                            <div class="col-6">
                                <label for="ragTopK" class="form-label">Top K</label>
                                <input type="number" class="form-control" id="ragTopK" min="1" max="32" step="1"
                                    v-model.number="ragDraft.topK" />
                                <div class="form-text">How many chunks to consider.</div>
                            </div>
                            <div class="col-6">
                                <label for="ragMinSim" class="form-label">Min Similarity</label>
                                <input type="number" class="form-control" id="ragMinSim" min="0" max="1" step="0.01"
                                    v-model.number="ragDraft.minSim" />
                                <div class="form-text">Cosine threshold 0 &rarr; 1.</div>
                            </div>
                            <div class="col-6">
                                <label for="ragChunkTokens" class="form-label">Chunk Size (tokens)</label>
                                <input type="number" class="form-control" id="ragChunkTokens" min="200" max="8192"
                                    step="20" v-model.number="ragDraft.chunkingTokens" />
                                <div class="form-text">Max tokens per chunk when creating embeddings.</div>
                            </div>
                            <div class="col-6">
                                <label for="ragBudgetTokens" class="form-label">Budget Tokens</label>
                                <input type="number" class="form-control" id="ragBudgetTokens" min="1000" max="20000"
                                    step="100" v-model.number="ragDraft.budgetTokens" />
                                <div class="form-text">Total tokens across snippets.</div>
                            </div>
                            <div class="col-6">
                                <label for="ragOverlapTokens" class="form-label">Overlap Tokens</label>
                                <input type="number" class="form-control" id="ragOverlapTokens" min="0" max="1024"
                                    step="4" v-model.number="ragDraft.overlapTokens" />
                                <div class="form-text">Tokens to overlap between consecutive chunks.</div>
                            </div>
                            <div class="col-6">
                                <label for="ragMinSnippetTokens" class="form-label">Min Snippet Tokens</label>
                                <input type="number" class="form-control" id="ragMinSnippetTokens" min="50" max="1000"
                                    step="50" v-model.number="ragDraft.minSnippetTokens" />
                                <div class="form-text">Minimum tokens per snippet.</div>
                            </div>

                            <div v-if="hasEmbeddings" class="col-12">
                                <fieldset>
                                    <legend class="form-label">Embedded Sources to Include</legend>
                                    <div class="border rounded p-2 embedding-sources-list">
                                        <div v-for="src in ragSources" :key="src"
                                            class="form-check d-flex align-items-center justify-content-between">
                                            <span class="d-flex align-items-center gap-2">
                                                <input class="form-check-input mt-0" type="checkbox" :id="'src-' + src"
                                                    :checked="enabledSources.includes(src)"
                                                    @change="toggleSource(src)" />
                                                <label class="form-check-label" :for="'src-' + src">{{ src }}</label>
                                            </span>
                                            <button type="button" class="btn btn-sm btn-link text-danger p-0 px-1"
                                                v-bs-tooltip="'Remove embeddings for this file'"
                                                @click="onRemoveSource(src)">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </fieldset>
                                <div class="form-text mt-1">
                                    Using {{ enabledSources.length }} of {{ ragSources.length }} embedded files.
                                </div>
                            </div>
                            <p v-else class="col-12 form-text mb-0">
                                No embedded documents yet. Use "Add files for embeddings" to index one.
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="showRagSettings = false">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">Apply</button>
                    </div>
                </form>
            </div>
        </div>

        <Teleport to="body">
        <div class="toast-container app-toasts position-fixed top-0 end-0 p-3">
            <div v-for="t in toasts" :key="t.id"
                :class="['toast', 'align-items-center', 'border-0', 'show', 'text-bg-' + t.type]"
                role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">{{ t.message }}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto"
                        aria-label="Close" @click="dismissToast(t.id)"></button>
                </div>
            </div>
        </div>
        </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { markdownToHtml, finalizeMarkdown, escapeHtml } from './utils/markdown.js'
import { highlightElement } from './utils/prism.js'
import { renderStreamingMarkdown, resetStreamingRender } from './utils/streamingMarkdown.js'
import { base64ToBlob, toImageFileName, clickDownloadLink, IMAGE_MIME } from './utils/image.js'

import { useModels } from './composables/useModels.js'
import { useChatStream } from './composables/useChatStream.js'
import { useConversations } from './composables/useConversations.js'
import { deleteImagesForMessages } from './utils/db.js'
import { useRag } from './composables/useRag.js'
import { useToasts } from './composables/useToasts.js'
import { extractTextFromFile, isSupportedDocument, getBaseName, DOC_ACCEPT } from './utils/documents.js'
import { selectHistoryForRequest, estimateTokens, estimateContextUsage } from './composables/useTokens.js'
import { vBsTooltip } from './useTooltip.js'

// --- State ---
const input = ref('')
const messages = reactive([])
const status = ref('Ready')
const iterateInstruction = ref('')
const showIterateModal = ref(false)
const promptInput = ref(null)
const chatContainer = ref(null)
const isSending = ref(false)
const images = reactive([])
const iterationTarget = ref(null)
const connectionStatus = ref('disconnected')

const {
    models,
    registry,
    loaded: modelsLoaded,
    currentModelKey,
    activeModel,
    activeReasoning,
    reasoningOptions,
    supportsReasoning,
    loadModels,
    setModel,
    setReasoning,
    reasoningLabel,
} = useModels()

const { isStreaming, send: streamSend, stop: stopStream } = useChatStream()

const {
    conversations,
    currentConversationId,
    loadConversations,
    saveConversation,
    renameConversation,
    removeConversation,
    startNewConversation,
    persistImage,
    getImageBlob,
    getImageObjectUrl,
    releaseAllObjectUrls,
    maybeGenerateTitle,
} = useConversations()

// Open by default on wide screens, where it sits beside the chat; closed on
// narrow ones, where it would overlay the conversation behind a backdrop.
const {
    settings: ragSettings,
    sources: ragSources,
    enabledSources,
    docContext,
    docName,
    busy: ragBusy,
    progress: ragProgress,
    lastCitations,
    lastResolvedRagTokens,
    hasEmbeddings,
    hasEnabledSources,
    init: initRag,
    updateSettings: updateRagSettings,
    toggleSource,
    embedText,
    removeSource,
    clearEmbeddings,
    setDocContext,
    clearDocContext,
    safeRetrieve,
    searchDocuments,
} = useRag()

const { toasts, showToast, dismissToast } = useToasts()

// A usage estimate walks the whole history, so it is far too heavy to run per
// keystroke. The trailing delay does the work; the ceiling keeps the counter
// moving during sustained typing instead of freezing until the typist pauses.
const CONTEXT_DEBOUNCE_MS = 120
const CONTEXT_MAX_WAIT_MS = 500

// How long a copy button shows its confirmation tick before reverting.
const COPY_FEEDBACK_MS = 1600

const debouncedDraft = ref('')
const showContextDetail = ref(false)

// Which response bubble has its stats popover open, if any. Declared here
// rather than beside the stats helpers because the watch below reads it
// during setup.
const openStatsFor = ref(null)

let contextTimer = null
let contextDeadline = 0

const scheduleContextUpdate = () => {
    const now = Date.now()

    if (contextTimer === null) {
        contextDeadline = now + CONTEXT_MAX_WAIT_MS
    } else {
        clearTimeout(contextTimer)
    }

    const delay = Math.max(0, Math.min(CONTEXT_DEBOUNCE_MS, contextDeadline - now))

    contextTimer = setTimeout(() => {
        contextTimer = null
        // Reads the live value when it fires, so a stale keystroke never
        // paints an out-of-date number.
        debouncedDraft.value = input.value
    }, delay)
}

const showRagSettings = ref(false)
const ragDraft = reactive({ ...ragSettings })
const contextFileInput = ref(null)
const embedFileInput = ref(null)
const docAccept = DOC_ACCEPT
// One mode at a time, as in the source: picking image turns web search off
// and vice versa. null means an ordinary chat turn.
const PROMPT_MODES = { IMAGE: 'image', WEB_SEARCH: 'web-search' }
const DEFAULT_PLACEHOLDER = 'Type your message ... (Shift+Enter for new line)'
const IMAGE_PLACEHOLDER = 'Describe your image ...'

const activePromptMode = ref(null)

const isImageMode = computed(() => activePromptMode.value === PROMPT_MODES.IMAGE)
const isWebSearchMode = computed(() => activePromptMode.value === PROMPT_MODES.WEB_SEARCH)

const promptPlaceholder = computed(() =>
    isImageMode.value ? IMAGE_PLACEHOLDER : DEFAULT_PLACEHOLDER,
)

const togglePromptMode = (mode) => {
    activePromptMode.value = activePromptMode.value === mode ? null : mode
    nextTick(() => promptInput.value?.focus())
}

const clearPromptMode = () => {
    activePromptMode.value = null
    nextTick(() => promptInput.value?.focus())
}
const toolStatus = ref('')

const sidebarOpen = ref(typeof window !== 'undefined' && window.innerWidth >= 992)
const editingMessageId = ref(null)
const editDraft = ref('')

const showRenameModal = ref(false)
const renameDraft = ref('')
const renameTargetId = ref(null)

// Calibration for the token estimator, keyed by model id. The estimator counts
// words; how many tokens a word really costs varies by model and by content,
// so each completed response corrects the factor from its actual first-round
// input usage. Only the first round is usable -- later rounds in a tool loop
// carry context this never sized.
const estimatorRatio = reactive({})

const getEstimatorRatio = () => estimatorRatio[activeModel.value?.id] || 1

const calibrateEstimator = (modelId, estimated, actual) => {
    if (!modelId || !estimated || !actual) return

    const next = actual / estimated
    if (!Number.isFinite(next) || next <= 0) return

    // Smooth rather than snap, so one unusual turn cannot swing the budget.
    const prev = estimatorRatio[modelId] || 1
    estimatorRatio[modelId] = Math.min(4, Math.max(0.25, prev * 0.7 + next * 0.3))
}

const vCodeEnhance = {
    mounted(el) { enhanceCodeBlocks(el) },
    updated(el) { enhanceCodeBlocks(el) },
}

// The streaming renderer owns its element's children, so this element carries
// no v-html and no template children -- Vue only ever hands it the raw text.
// Throttled to ~5fps: a skipped final tick is harmless because finishing the
// response swaps in the v-html branch, which does one exact full parse.
const STREAM_RENDER_INTERVAL_MS = 200
const lastStreamRender = new WeakMap()

const paintStream = (el, text, { force = false } = {}) => {
    const now = Date.now()

    if (!force && now - (lastStreamRender.get(el) || 0) < STREAM_RENDER_INTERVAL_MS) return

    lastStreamRender.set(el, now)
    renderStreamingMarkdown(el, text ?? '')
}

const vStreamMarkdown = {
    mounted(el, binding) { paintStream(el, binding.value, { force: true }) },
    updated(el, binding) { paintStream(el, binding.value) },
    unmounted(el) {
        resetStreamingRender(el)
        lastStreamRender.delete(el)
    },
}

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

// Image generation and chat streaming both own the input row, but only
// streaming can be stopped -- so they are tracked separately and combined here.
const busy = computed(() => isSending.value || isStreaming.value)

const contextUsage = computed(() =>
    estimateContextUsage({
        history: buildApiHistory(),
        draftPrompt: debouncedDraft.value,
        docContext: docContext.value,
        ragTokens: lastResolvedRagTokens.value,
        contextWindow: activeModel.value?.contextWindow ?? 128000,
        reservedOutput: activeModel.value?.defaultMax ?? 0,
        historyTokenCap: registry.historyTokenCap,
        systemPromptTokens: registry.systemPromptTokens,
        ratio: getEstimatorRatio(),
    }),
)

// Compact so the widget stays narrow: 128000 reads as 128.0k.
const formatCompactTokens = (num) => {
    if (!Number.isFinite(num)) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return String(num)
}

// Subtitle under the model name. Models without a reasoning parameter show
// their context window instead, so the line is never blank.
const modelMetaLine = computed(() => {
    if (!activeModel.value) return ''

    return activeReasoning.value
        ? `Reasoning: ${reasoningLabel(activeReasoning.value)}`
        : `Context: ${formatCompactTokens(activeModel.value.contextWindow || 0)}`
})

const contextLevel = computed(() => {
    const pct = contextUsage.value.percent
    return pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : ''
})

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
        html: markdownToHtml(resetMsg),
        role: 'bot',
        timestamp: Date.now(),
        // Display only. Without this the canned greeting is replayed to the
        // model as a real assistant turn on every request.
        isWelcome: true,
    })
}

// --- Lifecycle ---
onMounted(async () => {
    addWelcomeMessage()
    autoResize()
    document.addEventListener('shown.bs.dropdown', onModelMenuShown)

    try {
        await initRag()
    } catch (err) {
        console.warn('Failed to initialise RAG state:', err)
    }

    try {
        await loadConversations()
    } catch (err) {
        console.warn('Failed to load saved conversations:', err)
    }

    try {
        await loadModels()
    } catch (err) {
        // Without the registry there is no model to send to, so surface it
        // rather than failing later inside send().
        status.value = `Could not load models: ${err.message}`
        connectionStatus.value = 'disconnected'
        showToast(`Could not load models: ${err.message}`, { type: 'error', autohide: false })
    }
})

watch(input, scheduleContextUpdate)

// The popover is a plain element, not a Bootstrap component, so nothing closes
// it on its own. Listening only while it is open avoids a permanent global
// handler; capture phase so it still fires when the click lands on something
// that stops propagation.
const onDocumentClickForPopover = (event) => {
    if (!event.target.closest?.('.context-widget')) {
        showContextDetail.value = false
    }
}

// The selected model can sit below the fold of the bounded list, so the menu
// opens scrolled to it. Bootstrap fires shown.bs.dropdown on the toggle and it
// bubbles, so this is bound once on the document rather than to a button that
// only exists after the registry loads.
const onModelMenuShown = (event) => {
    if (!event.target?.closest?.('.model-control')) return

    requestAnimationFrame(() => {
        document
            .querySelector('.model-options-list .model-option.active')
            ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
}

// Same idea for the per-response stats popover: it lives inside a bubble, so
// it needs its own dismissal.
const onDocumentClickForStats = (event) => {
    if (!event.target.closest?.('.stats-popover, [data-stats-trigger]')) {
        openStatsFor.value = null
    }
}

watch(openStatsFor, (open) => {
    if (open) {
        document.addEventListener('click', onDocumentClickForStats, true)
    } else {
        document.removeEventListener('click', onDocumentClickForStats, true)
    }
})

watch(showContextDetail, (open) => {
    if (open) {
        document.addEventListener('click', onDocumentClickForPopover, true)
    } else {
        document.removeEventListener('click', onDocumentClickForPopover, true)
    }
})

onBeforeUnmount(() => {
    document.removeEventListener('shown.bs.dropdown', onModelMenuShown)
    document.removeEventListener('click', onDocumentClickForPopover, true)
    document.removeEventListener('click', onDocumentClickForStats, true)
    if (contextTimer !== null) clearTimeout(contextTimer)
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
        if (!busy.value && input.value.trim().length >= 2) send()
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

// ----------- GENERATE with DALL-E 2 -----------
// gpt-image-1 returns base64, never a hosted url. Decode to a Blob up front:
// it is what gets stored, rendered and re-edited, and it is ~33% smaller than
// the base64 it arrived as.
async function generateImage(prompt) {
    const response = await fetch('/api/image/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    if (!data.b64_json) throw new Error('No image returned.')

    return {
        blob: base64ToBlob(data.b64_json, IMAGE_MIME),
        prompt,
    }
}

// ----------- Edits with gpt-image-1 -----------

// Takes the Blob we already hold rather than re-downloading the image: there
// is no remote url to fetch any more. No mask is sent either -- dall-e-2
// required one, so this used to synthesise a fully transparent canvas, but
// gpt-image-1 treats it as optional and reworks the whole frame without it,
// which is exactly what "iterate on this image" means.
async function generateImageEdit(sourceBlob, prompt) {
    if (!sourceBlob) throw new Error('No source image to edit.')

    const formData = new FormData()
    formData.append('image', sourceBlob, 'image.png')
    formData.append('prompt', prompt)

    const response = await fetch('/api/image/edit-image', {
        method: 'POST',
        body: formData
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    if (!data.b64_json) throw new Error('No image returned.')

    return {
        blob: base64ToBlob(data.b64_json, IMAGE_MIME),
        prompt,
    }
}

// Every rendered image is a same-origin blob: url backed by the image store,
// so the anchor consumes it directly -- no fetch, no CORS, and nothing to
// revoke afterwards (the url is still the <img> src).
function downloadImage(url, altText) {
    if (!url) return

    try {
        clickDownloadLink(url, toImageFileName(altText))
    } catch (err) {
        console.warn('[Download] Failed:', err)
        showToast('Unable to download image in this environment. Right-click it instead.', {
            type: 'warning',
        })
    }
}

// --- Image Modal handlers ---
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
        .then(async ({ blob, prompt: resultPrompt }) => {
            const imageId = Date.now().toString(36)

            // Rendered from the bytes we already hold, so the image appears
            // whether or not it can be persisted.
            botMsg.content = ''
            botMsg.imageUrl = URL.createObjectURL(blob)
            botMsg.imageId = imageId
            botMsg.imageBlob = blob
            botMsg.imageInfo = { id: imageId, blob, prompt: resultPrompt }
            images.push(botMsg.imageInfo)

            status.value = 'Image generated'
            connectionStatus.value = 'connected'

            try {
                await persistImage({ id: imageId, messageId: botMsg.id, blob, prompt: resultPrompt })
                await persistCurrentConversation()
            } catch (err) {
                console.warn('Failed to persist generated image:', err)
            }
        })
        .catch((error) => {
            const errorMsg = error.message || "An unexpected error occurred"
            botMsg.content = `Error: ${errorMsg}`
            botMsg.html = `<span style="color:#dc3545;">Error: ${errorMsg}</span>`
            status.value = `Error: ${errorMsg}`
            connectionStatus.value = 'disconnected'
            showToast(errorMsg, { type: 'error' })
        })
        .finally(() => {
            isSending.value = false
        })
}
function handleIterateImage(imageInfo) {
    iterationTarget.value = imageInfo
    showIterateModal.value = true
}
function handleConfirmEdit() {
    console.log("apply button pressed.");
    const instruction = iterateInstruction.value.trim()
    console.log(`${instruction}`);
    if (instruction.length < 2) return
    showIterateModal.value = false
    requestImageEdit(instruction, iterationTarget.value)
    iterateInstruction.value = ''
}
async function requestImageEdit(iteratePrompt, target) {
    console.log("requestImageEdit function called.");
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
        const sourceBlob = target?.blob || (target?.id ? await getImageBlob(target.id) : null)
        if (!sourceBlob) throw new Error('No source image to edit.')

        const { blob, prompt: resultPrompt } = await generateImageEdit(sourceBlob, iteratePrompt)

        const imageId = Date.now().toString(36)
        const imageInfo = { id: imageId, blob, prompt: resultPrompt }

        images.push(imageInfo)
        botMsg.content = ''
        botMsg.imageUrl = URL.createObjectURL(blob)
        botMsg.imageId = imageId
        botMsg.imageBlob = blob
        botMsg.imageInfo = imageInfo

        status.value = 'Image generated'
        connectionStatus.value = 'connected'

        try {
            await persistImage({ id: imageId, messageId: botMsg.id, blob, prompt: resultPrompt })
            await persistCurrentConversation()
        } catch (err) {
            console.warn('Failed to persist edited image:', err)
        }
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

// Roles on screen are user/bot; the API speaks user/assistant.
const toApiRole = (role) => (role === 'bot' ? 'assistant' : 'user')

// Everything the API should see, excluding image cards (which have no text
// content) and the placeholder bubble currently being streamed into.
const buildApiHistory = (excludeId = null) =>
    messages
        .filter(
            (m) =>
                !m.isImage &&
                !m.isWelcome &&
                m.id !== excludeId &&
                typeof m.content === 'string' &&
                m.content.trim(),
        )
        .map((m) => ({ role: toApiRole(m.role), content: m.content }))

const budgetOptions = () => ({
    contextWindow: activeModel.value?.contextWindow ?? 128000,
    reservedOutput: activeModel.value?.defaultMax ?? 0,
    historyTokenCap: registry.historyTokenCap,
    // The server prepends the system prompt, so its cost is spent whether or
    // not we can see the text.
    systemPromptTokens: registry.systemPromptTokens,
    // Doc and RAG context are injected fresh each turn and compete with
    // history for the same input budget.
    docTokens: docContext.value ? estimateTokens(docContext.value) : 0,
    ragTokens: lastResolvedRagTokens.value,
})

// What gets written to IndexedDB. The rendered html is deliberately excluded:
// it is derived from content and would roughly double the stored size, and the
// renderer that produced it can change between sessions.
const toStoredMessages = () =>
    messages
        .filter((m) => !m.isWelcome)
        .map((m) => ({
            id: m.id,
            role: toApiRole(m.role),
            content: m.content,
            timestamp: m.timestamp,
            ...(m.stats ? { stats: m.stats } : {}),
            ...(m.imageId ? { image: { id: m.imageId, prompt: m.imagePrompt || '' } } : {}),
        }))

// Saving must never break the turn that triggered it.
const persistCurrentConversation = async () => {
    try {
        await saveConversation(toStoredMessages())
    } catch (err) {
        console.warn('Failed to save conversation:', err)
    }
}

// Runs one assistant turn against an existing placeholder bubble. Shared by
// the normal send path, retry, and edit-and-resend, all of which differ only in
// how the history ahead of the turn was assembled.
async function runTurn({ prompt, botMsg }) {
    connectionStatus.value = 'connecting'
    status.value = 'Sending to OpenAI...'

    // Built excluding the placeholder, so an empty assistant turn is never sent.
    const selected = selectHistoryForRequest(
        buildApiHistory(botMsg.id),
        budgetOptions(),
        getEstimatorRatio(),
    )
    const apiInput = [...selected.systems, ...selected.convo]

    const modelId = activeModel.value?.id

    // Retrieved with the user's own wording, which is often a poor search
    // query. That is why the model is also given search_documents: it can
    // re-run the search with better phrasing when this comes back thin.
    let ragContext = ''
    // Captured per turn. Reading the composable's lastCitations at the end of
    // the turn instead carried the previous conversation's sources into a
    // reply that never retrieved anything.
    let turnCitations = []

    if (hasEnabledSources.value) {
        status.value = 'Searching documents...'
        const retrieved = await safeRetrieve(prompt)
        ragContext = retrieved.context
        turnCitations = retrieved.citations || []
    } else {
        // No retrieval this turn, so nothing stale should be left behind for
        // the context widget to report either.
        lastCitations.value = []
        lastResolvedRagTokens.value = 0
    }

    try {
        status.value = 'Sending to OpenAI...'

        const result = await streamSend({
            input: apiInput,
            modelKey: currentModelKey.value,
            reasoning: activeReasoning.value,
            useWebSearch: isWebSearchMode.value,
            docContext: docContext.value,
            docName: docName.value,
            ragContext,
            // Only offered when there is something to search; advertising it
            // over an empty index just invites a wasted round trip.
            enableDocumentSearch: hasEnabledSources.value,
            onToolStatus: (calls) => {
                toolStatus.value = calls.map((c) => c.name).join(', ')
                status.value = 'Searching documents...'
            },
            onToolCall: async (name, args) => {
                if (name === 'search_documents') return searchDocuments(args)
                return { ok: false, error: `Unknown tool: ${name}` }
            },
            onDelta: (text) => {
                // Only the raw text is set; the directive renders it
                // incrementally. Assigning html here would re-parse the whole
                // answer on every delta, which is what this replaced.
                botMsg.content = text
                nextTick(scrollToBottom)
            },
        })

        // A stop leaves whatever streamed on screen rather than discarding it.
        botMsg.content = result.text
        // One exact parse of the finished text, with the nested-fence repair
        // that streaming has to skip (a half-arrived block has no closing
        // fence yet). This corrects anything the incremental pass approximated.
        botMsg.html = result.text
            ? finalizeMarkdown(result.text)
            : '<em style="color: var(--text-muted)">No response.</em>'
        botMsg.streaming = false

        botMsg.stats = result.stats.rounds ? result.stats : null
        botMsg.timestamp = Date.now()
        botMsg.citations = turnCitations.length ? [...turnCitations] : null
        toolStatus.value = ''

        calibrateEstimator(modelId, selected.tokens, result.stats.firstRoundInput)

        await persistCurrentConversation()

        // Fire-and-forget: the title is cosmetic and its model call should not
        // hold up the next message.
        maybeGenerateTitle().catch((err) => console.warn('Title generation failed:', err))

        status.value = result.aborted ? 'Stopped' : 'Response completed'
        connectionStatus.value = 'connected'
    } catch (e) {
        status.value = 'Error: ' + (e.message || 'An unexpected error occurred')
        connectionStatus.value = 'disconnected'
        showToast(e.message || 'An unexpected error occurred', { type: 'error' })
        botMsg.html = `<span style="color:#dc3545;">Error: ${escapeHtml(e.message)}</span>`
        botMsg.streaming = false
        toolStatus.value = ''
    } finally {
        await nextTick()
        autoResize()
        scrollToBottom()
    }
}

const createBotPlaceholder = () =>
    reactive({
        id: Date.now() + Math.random(),
        content: '',
        html: '',
        role: 'bot',
        timestamp: Date.now(),
        stats: null,
        citations: null,
        streaming: true,
    })

async function send() {
    if (isStreaming.value) return

    const prompt = input.value.trim()
    if (!prompt) return

    input.value = ''
    autoResize()

    // Image mode takes the prompt from the textarea rather than a modal, and
    // pushes its own message pair. The mode stays on afterwards, so several
    // images can be generated in a row until the pill is dismissed.
    if (isImageMode.value) {
        requestImage(prompt)
        return
    }

    messages.push({
        id: Date.now() + Math.random(),
        content: prompt,
        html: '',
        role: 'user',
        timestamp: Date.now(),
    })

    scrollToBottom()

    const botMsg = createBotPlaceholder()
    messages.push(botMsg)
    scrollToBottom()

    await runTurn({ prompt, botMsg })
}

// --- Message actions ---

const findMessageIndex = (msg) => messages.findIndex((m) => m.id === msg.id)

// The user turn a given assistant reply was answering.
const findPrecedingUserMessage = (botMsg) => {
    const idx = findMessageIndex(botMsg)
    if (idx === -1) return null

    for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === 'user') return messages[i]
    }

    return null
}

const copyToClipboard = async (text, label = 'Copied') => {
    if (!text) return false

    try {
        await navigator.clipboard.writeText(text)
        showToast(label, { type: 'success', delay: 1500 })
        return true
    } catch (err) {
        showToast(`Could not copy: ${err.message}`, { type: 'warning' })
        return false
    }
}

// Which message's copy button is currently showing its confirmation tick.
const copiedMessageId = ref(null)
let copiedResetTimer = null

const onCopyMessage = async (msg) => {
    const ok = await copyToClipboard(msg.content, msg.role === 'user' ? 'Prompt copied' : 'Answer copied')
    if (!ok) return

    copiedMessageId.value = msg.id
    clearTimeout(copiedResetTimer)
    copiedResetTimer = setTimeout(() => {
        // Only clear if no later copy has claimed the tick in the meantime.
        if (copiedMessageId.value === msg.id) copiedMessageId.value = null
    }, COPY_FEEDBACK_MS)
}

// Regenerates an answer in place. Everything after it is discarded first, or
// the conversation would branch: the model would see a later exchange that was
// a reply to the answer being replaced.
async function onRetryMessage(botMsg) {
    if (isStreaming.value) {
        showToast('Already streaming. Please wait or press Stop.', { type: 'warning' })
        return
    }

    const userMsg = findPrecedingUserMessage(botMsg)

    if (!userMsg) {
        showToast('No prompt available to retry.', { type: 'warning' })
        return
    }

    const idx = findMessageIndex(botMsg)
    const trailing = messages.length - (idx + 1)

    if (trailing > 0) {
        const plural = trailing === 1 ? '' : 's'
        if (!window.confirm(`Retrying will remove the ${trailing} message${plural} that follow.`)) {
            return
        }
    }

    messages.splice(idx, messages.length - idx)

    const fresh = createBotPlaceholder()
    messages.push(fresh)

    await nextTick()
    scrollToBottom()
    await runTurn({ prompt: userMsg.content, botMsg: fresh })
}

// Deletes an exchange: the assistant turn and the user turn it answered, so
// history is never left with a dangling prompt.
async function onDeleteMessage(botMsg) {
    if (isStreaming.value) {
        showToast('Already streaming. Please wait or press Stop.', { type: 'warning' })
        return
    }

    const botIdx = findMessageIndex(botMsg)
    if (botIdx === -1) return

    const userMsg = findPrecedingUserMessage(botMsg)
    const userIdx = userMsg ? findMessageIndex(userMsg) : -1

    if (!window.confirm('Delete this exchange?')) return

    // Highest index first, so removing one does not shift the other.
    messages.splice(botIdx, 1)
    if (userIdx !== -1) messages.splice(userIdx, 1)

    if (botMsg.imageId) {
        try {
            await deleteImagesForMessages([botMsg.id])
        } catch (err) {
            console.warn('Failed to delete image for message:', err)
        }
    }

    await persistCurrentConversation()
    status.value = 'Exchange deleted'
}

function beginEditPrompt(msg) {
    if (isStreaming.value) {
        showToast('Already streaming. Please wait or press Stop.', { type: 'warning' })
        return
    }

    editingMessageId.value = msg.id
    editDraft.value = msg.content
}

function cancelEditPrompt() {
    editingMessageId.value = null
    editDraft.value = ''
}

// Rewrites a prompt and re-runs from that point. Everything after it is
// discarded: those turns answered the old wording.
async function confirmEditPrompt(msg) {
    const newPrompt = editDraft.value.trim()

    if (!newPrompt) return
    if (isStreaming.value) return

    const idx = findMessageIndex(msg)
    if (idx === -1) return

    const trailing = messages.length - (idx + 1)

    if (trailing > 0) {
        const plural = trailing === 1 ? '' : 's'
        const ok = window.confirm(
            `Resending this prompt will remove the ${trailing} message${plural} that follow it.`,
        )
        if (!ok) return
    }

    msg.content = newPrompt
    msg.timestamp = Date.now()
    messages.splice(idx + 1, messages.length - (idx + 1))

    cancelEditPrompt()

    const botMsg = createBotPlaceholder()
    messages.push(botMsg)

    await nextTick()
    scrollToBottom()
    await runTurn({ prompt: newPrompt, botMsg })
}

// --- Documents & RAG ---

// A single file inlined as background context for every turn. Distinct from
// embeddings: no retrieval, the whole text is sent each time, so it is capped.
const MAX_DOC_CONTEXT_CHARS = 200000

async function onPickContextFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same file be chosen again

    if (!file) return

    if (!isSupportedDocument(file)) {
        status.value = `Unsupported file type: ${getBaseName(file)}`
        showToast(`Unsupported file type: ${getBaseName(file)}`, { type: 'warning' })
        return
    }

    try {
        status.value = `Reading ${getBaseName(file)}...`

        const text = await extractTextFromFile(file)

        if (!text.trim()) throw new Error('No readable text found in that file.')

        const trimmed =
            text.length > MAX_DOC_CONTEXT_CHARS ? text.slice(0, MAX_DOC_CONTEXT_CHARS) : text

        setDocContext(trimmed, getBaseName(file))

        const note =
            trimmed.length < text.length
                ? `Loaded ${docName.value} (truncated to ${MAX_DOC_CONTEXT_CHARS.toLocaleString()} chars)`
                : `Loaded ${docName.value} as context`

        status.value = note
        showToast(note, { type: 'success' })
    } catch (err) {
        status.value = `Could not read file: ${err.message}`
        showToast(`Could not read file: ${err.message}`, { type: 'error' })
    }
}

async function onPickEmbedFiles(event) {
    const files = [...(event.target.files || [])]
    event.target.value = ''

    if (!files.length) return

    for (const file of files) {
        const name = getBaseName(file)

        if (!isSupportedDocument(file)) {
            status.value = `Skipped unsupported file: ${name}`
            continue
        }

        try {
            status.value = `Reading ${name}...`

            const text = await extractTextFromFile(file)

            if (!text.trim()) {
                status.value = `No readable text in ${name}`
                continue
            }

            const chunks = await embedText(text, name)
            status.value = `Embedded ${chunks} chunks from ${name}`
            showToast(`Embedded ${chunks} chunks from ${name}`, { type: 'success' })
        } catch (err) {
            status.value = `Failed to embed ${name}: ${err.message}`
            showToast(`Failed to embed ${name}: ${err.message}`, { type: 'error' })
        }
    }
}

function onClearDocContext() {
    // Not disabled when empty: a dead menu item gives no feedback and no
    // pointer cursor, so the click is answered with an explanation instead.
    if (!docContext.value) {
        showToast('No document context to clear', { type: 'info' })
        return
    }

    clearDocContext()
    status.value = 'Document context cleared'
    showToast('Document context cleared', { type: 'success' })
}

async function onDeleteAllEmbeddings() {
    if (!hasEmbeddings.value) {
        showToast('No embedded documents to delete', { type: 'info' })
        return
    }

    if (!window.confirm('Delete all embedded vectors? This cannot be undone.')) return

    try {
        const cleared = await clearEmbeddings()
        // The store holds one record per chunk, so this counts chunks rather
        // than files -- the source labelled the same number "files".
        const message = `Cleared ${cleared} embedded chunk${cleared === 1 ? '' : 's'}`

        status.value = message
        showToast(message, { type: 'success' })
    } catch (err) {
        console.error('Failed to clear embeddings:', err)
        showToast('Failed to clear embeddings', { type: 'error' })
    }
}

async function onRemoveSource(name) {
    if (!window.confirm(`Remove embeddings for "${name}"?`)) return

    try {
        await removeSource(name)
        status.value = `Removed embeddings for ${name}`
        showToast(`Removed embeddings for ${name}`, { type: 'success' })
    } catch (err) {
        console.error('Failed to remove embeddings:', err)
        showToast(`Failed to remove embeddings for ${name}`, { type: 'error' })
    }
}

function openRagSettings() {
    Object.assign(ragDraft, ragSettings)
    showRagSettings.value = true
}

function applyRagSettings() {
    updateRagSettings({ ...ragDraft })
    // Re-read: the composable clamps, so the draft may not be what was stored.
    Object.assign(ragDraft, ragSettings)
    showRagSettings.value = false
    status.value = 'RAG settings updated'
}

// --- Conversation sidebar ---

// Rebuilds the on-screen message list from a stored conversation. Stored
// records hold raw content only, so html is re-derived here through the same
// finalize path a live response ends with.
async function onOpenConversation(id) {
    if (isStreaming.value) return

    const conv = conversations.value.find((c) => c.id === id)
    if (!conv) return

    // The outgoing conversation's blob urls are about to go out of scope.
    releaseAllObjectUrls()
    lastCitations.value = []
    lastResolvedRagTokens.value = 0

    currentConversationId.value = id
    messages.splice(0, messages.length)

    for (const stored of conv.messages || []) {
        const msg = {
            id: stored.id ?? Date.now() + Math.random(),
            role: stored.role === 'assistant' ? 'bot' : 'user',
            content: stored.content || '',
            html: stored.role === 'assistant' ? finalizeMarkdown(stored.content || '') : '',
            timestamp: stored.timestamp || Date.now(),
            stats: stored.stats || null,
        }

        // Swap the stored image id for a fresh object url; the original DALL-E
        // link expired long ago.
        if (stored.image?.id) {
            const url = await getImageObjectUrl(stored.image.id)

            if (url) {
                msg.isImage = true
                msg.imageId = stored.image.id
                msg.imageUrl = url
                msg.imagePrompt = stored.image.prompt || ''
                // Carries no blob: the iterate flow reads the bytes back out
                // of the image store by id when it needs them.
                msg.imageInfo = { id: stored.image.id, prompt: stored.image.prompt || '' }
            }
        }

        messages.push(msg)
    }

    sidebarOpen.value = false
    status.value = 'Conversation loaded'
    await nextTick()
    scrollToBottom()
}

function onNewChat() {
    if (isStreaming.value) return

    startNewConversation()
    lastCitations.value = []
    lastResolvedRagTokens.value = 0
    addWelcomeMessage()
    input.value = ''
    status.value = 'Ready'
    sidebarOpen.value = false
    nextTick(autoResize)
}

function onRenameConversation(conv) {
    renameTargetId.value = conv.id
    renameDraft.value = conv.title || ''
    showRenameModal.value = true
}

async function confirmRename() {
    const title = renameDraft.value.trim()
    if (!title || !renameTargetId.value) return

    // Marked as user-set so background title generation leaves it alone.
    await renameConversation(renameTargetId.value, title, { generated: true })

    showRenameModal.value = false
    renameTargetId.value = null
    renameDraft.value = ''
}

async function onDeleteConversation(conv) {
    if (!window.confirm(`Delete "${conv.title}"? This cannot be undone.`)) return

    const wasCurrent = conv.id === currentConversationId.value

    await removeConversation(conv.id)

    if (wasCurrent) {
        // Deleting the chat you are in leaves an empty screen; retrieval state
        // has to go with it, or the next reply is captioned with the deleted
        // conversation's sources.
        lastCitations.value = []
        lastResolvedRagTokens.value = 0
        addWelcomeMessage()
        status.value = 'Ready'
    }
}

async function onSendOrStop() {
    if (isStreaming.value) {
        await stopStream()
        return
    }

    await send()
}

// --- Response stats ---

const toggleStats = (msg) => {
    openStatsFor.value = openStatsFor.value === msg.id ? null : msg.id
}

// Mirrors the source's stats popover: three groups, separated by a rule.
// Rows that would read as zero are left out entirely rather than shown as "0",
// which says nothing.
const statsRows = (stats) => {
    if (!stats) return []

    const row = (label, value, muted = false) => ({ label, value, muted })

    const identity = [row('Model', (stats.model || '\u2014').replace('gpt-', 'GPT-'))]
    if (stats.rounds > 1) identity.push(row('API rounds', stats.rounds.toLocaleString(), true))

    const tokens = [
        row('Input tokens', (stats.inputTokens || 0).toLocaleString()),
        row('Output tokens', (stats.outputTokens || 0).toLocaleString()),
    ]
    if (stats.cachedTokens) tokens.push(row('Cached tokens', stats.cachedTokens.toLocaleString(), true))
    if (stats.reasoningTokens)
        tokens.push(row('Reasoning tokens', stats.reasoningTokens.toLocaleString(), true))

    const totals = [
        row('Total tokens', ((stats.inputTokens || 0) + (stats.outputTokens || 0)).toLocaleString()),
    ]

    const elapsed =
        stats.startTime && stats.completedAt
            ? (stats.completedAt - stats.startTime) / 1000
            : null

    if (elapsed !== null) totals.push(row('Time to complete', `${elapsed.toFixed(1)}s`))
    if (stats.genMs && stats.rounds > 1)
        totals.push(row('Generating', `${(stats.genMs / 1000).toFixed(1)}s`, true))

    // Generation speed, so divide by model time rather than wall clock --
    // otherwise tool execution between rounds counts against the rate.
    // Conversations saved before genMs existed fall back to wall clock.
    const genSecs = stats.genMs ? stats.genMs / 1000 : elapsed
    if (genSecs && stats.outputTokens) {
        totals.push(row('Tokens / sec', (stats.outputTokens / genSecs).toFixed(1)))
    }

    return [identity, tokens, totals]
}



// --- Code Block Enhancement (Prism + Copy) ---
function enhanceCodeBlocks(el) {
    if (!el) return;
    el.querySelectorAll('pre code').forEach((codeEl) => {
        const pre = codeEl.closest('pre');
        if (!pre || pre.dataset.enhanced === '1') return;
        pre.dataset.enhanced = '1';

        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';

        // Get language name
        const langClass = [...codeEl.classList].find(c => c.startsWith('language-'));
        const langName = langClass ? langClass.replace('language-', '') : 'code';

        // Header
        const header = document.createElement('div');
        header.className = 'pre-header d-flex justify-content-between align-items-center';

        const label = document.createElement('span');
        label.className = 'code-lang-label small';
        label.textContent = langName;

        const copyIcon = '<i class="bi bi-copy px-1"></i>';
        const copiedIcon = '<i class="bi bi-check2 px-1"></i>';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-outline-secondary copy-btn';
        btn.innerHTML = copyIcon;
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(codeEl.textContent || '').then(() => {
                btn.innerHTML = copiedIcon;
                setTimeout(() => { btn.innerHTML = copyIcon; }, COPY_FEEDBACK_MS);
            });
        });

        header.appendChild(label);
        header.appendChild(btn);

        // Wrap
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);

        // Grammar is fetched on demand, so this resolves after a network
        // round trip for a language not seen before.
        highlightElement(codeEl);
    });
}

watch(
    () => messages.length,
    async () => {
        await nextTick();
        scrollToBottom();
    }
);
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

    /* Carried over from the source stylesheet, which the model and action
       controls below are written against. */
    --bg-highlight: rgba(99, 102, 241, 0.35);
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-xl: 16px;
    --transition-fast: 0.15s ease;
    --control-size: 36px;
    --control-size-sm: 32px;
    --sidebar-width-open: 270px;
    --sidebar-width-closed: 56px;
    --conversation-menu-width: 28px;
    --conversation-menu-height: 24px;
    --z-conversation-menu: 4000;
    --z-tooltip: 5000;
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
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
    min-height: 0;
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
    z-index: var(--z-tooltip) !important;
    pointer-events: none;
}

.tooltip .tooltip-inner {
    background: #292c38;
    color: var(--text-primary);
    border: 1.5px solid var(--border-color);
    border-radius: 0.375rem;
    padding: var(--space-2) 1rem;
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
/*************************************************************
    Conversation Sidebar
    **************************************************************/
.app-shell {
    overflow: hidden;
}

/* min-width:0 lets the chat column shrink instead of forcing the shell wider
   than the viewport -- a flex item's default min-width:auto refuses to go
   below its content, and long code blocks are very wide content. */
.min-w-0 {
    min-width: 0;
}

.chat-sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width-open);
    min-width: var(--sidebar-width-open);
    flex: 0 0 auto;
    background: var(--bg-secondary);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    transition: width 0.25s ease, min-width 0.25s ease, transform 0.2s ease;
}

.chat-sidebar.closed {
    width: var(--sidebar-width-closed);
    min-width: var(--sidebar-width-closed);
}

.sidebar-top {
    position: relative;
    z-index: 10;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 19px 8px 4px;
}

.sidebar-top::after {
    content: "";
    position: absolute;
    right: 12px;
    bottom: -18px;
    left: 0;
    height: 18px;
    background: linear-gradient(to bottom, var(--bg-secondary), transparent);
    pointer-events: none;
}

.sidebar-new-chat-row {
    gap: 10px;
    white-space: nowrap;
}

.sidebar-toggle-btn,
.new-chat-btn,
.sidebar-settings-btn {
    width: var(--control-size);
    height: var(--control-size);
    flex: 0 0 var(--control-size);
    padding: 0;
    border: 0;
    border-radius: var(--radius-md);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-secondary);
    transition: background-color 0.25s ease, color 0.25s ease;
}

.sidebar-toggle-btn:hover,
.new-chat-btn:hover,
.sidebar-settings-btn:hover {
    background: var(--bg-primary);
    color: var(--text-primary);
}

.sidebar-toggle-btn i,
.new-chat-btn i,
.sidebar-settings-btn i {
    font-size: 1.25rem;
    line-height: 1;
}

.sidebar-title-text {
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 600;
}

.chat-sidebar.closed .sidebar-title-text,
.chat-sidebar.closed .sidebar-scroll-area {
    display: none;
}

.sidebar-scroll-area {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
}

.sidebar-chats-title {
    flex: 0 0 auto;
    height: var(--control-size);
    margin: 6px 6px 0;
    padding: 0 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: var(--radius-md);
    color: var(--text-primary);
    white-space: nowrap;
}

.sidebar-title-icon {
    flex: 0 0 auto;
    font-size: 1rem;
}

.sidebar-list {
    flex: 1 1 auto;
    min-height: 0;
    overflow: visible;
    padding-top: 6px;
}

.conversation-empty {
    padding: 12px 16px;
    color: var(--text-muted);
    font-size: 0.85rem;
}

.conversation-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    padding-left: 10px;
    margin: 2px 6px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-size: 0.785rem;
    transition: background-color 0.25s ease, border-color 0.25s ease;
}

.conversation-item:hover,
.conversation-item.active,
.conversation-item:active {
    background: var(--bg-highlight);
    border-color: rgba(255, 255, 255, 0.05);
}

.conversation-main {
    flex: 1 1 auto;
    min-width: 0;
    padding: 7px 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
}

.conversation-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-menu-wrap {
    flex: 0 0 auto;
}

.conversation-menu-btn {
    width: var(--conversation-menu-width);
    height: var(--conversation-menu-height);
    margin: 1px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    opacity: 0;
    transition: opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.conversation-item:hover .conversation-menu-btn,
.conversation-item.active .conversation-menu-btn,
.conversation-menu-btn[aria-expanded="true"] {
    opacity: 1;
}

.conversation-menu-btn:hover,
.conversation-menu-btn:focus {
    background: var(--bg-primary);
    color: var(--text-primary);
}

.sidebar-list .dropdown-menu {
    min-width: max-content;
    width: max-content;
    padding: 4px;
    white-space: nowrap;
    z-index: var(--z-conversation-menu);
}

.sidebar-bottom {
    position: relative;
    z-index: 10;
    flex: 0 0 auto;
    margin-top: auto;
    padding: 16px 8px;
    display: flex;
    justify-content: flex-start;
}

.sidebar-bottom::before {
    content: "";
    position: absolute;
    top: -26px;
    right: 12px;
    left: 0;
    height: 26px;
    background: linear-gradient(to top, var(--bg-secondary), transparent);
    pointer-events: none;
}

.sidebar-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1040;
}

/* Below lg the sidebar overlays the chat instead of squeezing it. */
@media (max-width: 991.98px) {
    /* Keep the 56px collapsed rail visible so its own menu button can always
       reopen the overlaid sidebar. The chat clears that rail, while the open
       panel and its backdrop float above the rest of the app. */
    .chat-sidebar {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 1045;
    }

    .chat-main {
        margin-left: var(--sidebar-width-closed);
    }

    .chat-sidebar.is-open {
        width: var(--sidebar-width-open);
        min-width: var(--sidebar-width-open);
    }
}

@media (min-width: 992px) {
    .sidebar-backdrop {
        display: none;
    }
}

/*************************************************************
    Model & Reasoning Pickers
    **************************************************************/
.model-select,
.reasoning-select {
    width: auto;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--border-color);
}

.model-select:focus,
.reasoning-select:focus {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--bg-accent);
    box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
}

.model-select:disabled,
.reasoning-select:disabled {
    opacity: 0.6;
}

/*************************************************************
    Toasts
    **************************************************************/
/* Teleported to <body> so no overflow or stacking context in the app shell
   can clip it. Above the hand-rolled modals, which sit at 1055. */
.app-toasts {
    z-index: 1090;
}

/* Bootstrap sets pointer-events:none on the container so it does not block
   the page; the toasts themselves have to opt back in or the close button
   cannot be clicked. */
.app-toasts .toast {
    pointer-events: auto;
}

/*************************************************************
    Model Control (header)
    **************************************************************/
.model-control {
    position: relative;
}

.model-control-btn {
    min-width: 200px;
    max-width: 260px;
    height: 46px;
    padding: 6px 10px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.035);
    transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.model-control-btn:hover,
.model-control-btn:focus,
.model-control-btn:active,
.model-control-btn.show {
    color: var(--text-primary) !important;
    background: var(--bg-primary);
    border-color: var(--bg-bot);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24), 0 0 0 0.18rem rgba(99, 102, 241, 0.12);
}

.model-control-icon {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(99, 102, 241, 0.18);
    color: #c7d2fe;
    font-size: 1rem;
    line-height: 1;
}

.model-control-icon svg {
    display: block;
    width: 20px;
    height: 20px;
}

.model-control-copy {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.05;
    text-align: left;
}

.model-control-title,
.model-control-meta {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.model-control-title {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8rem;
    color: var(--text-primary);
}

.model-control-meta {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 2px;
}

.model-control-chevron {
    flex: 0 0 auto;
    color: var(--text-muted);
    font-size: 0.875rem;
    transition: transform 0.18s ease;
}

.model-control-btn.show .model-control-chevron {
    transform: rotate(180deg);
}

.model-control-menu {
    width: 280px;
    max-width: min(75vw, 280px);
    padding: 6px;
    border-radius: var(--radius-sm);
    /* A laptop viewport has to fit the menu plus the composer under it, so the
       whole surface is capped and scrolls if the sections still overflow. */
    max-height: min(72dvh, 520px);
    overflow-y: auto;
    background: var(--bg-secondary) !important;
    border: 1px solid var(--border-color) !important;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
    margin-top: 8px !important;
}

.model-control-section {
    padding: 0 2px;
}

.model-control-section-title {
    font-size: 0.675rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0 4px 5px;
}

.model-control-hint {
    font-size: 0.72rem;
    color: var(--text-muted);
    padding-right: 8px;
}

.model-control-divider {
    height: 1px;
    margin: 7px 2px;
    background: var(--border-color);
}

/* Bounded: 18 models would otherwise run the menu off the bottom of the
   viewport. The vh term is what keeps it short on a laptop. */
.model-options-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: min(182px, 30dvh);
    overflow-y: auto;
    padding-right: 2px;
}

.model-option {
    width: 100%;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    /* A pixel of the row's height moved from padding into margin: the active
       and hover fills stop 1px short top and bottom, so a highlight never
       touches the row above or below, and the row pitch is unchanged. */
    padding: 3px 9px;
    margin: 1px 0;
    text-align: left;
    font-size: 0.875rem;
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.model-option:hover,
.model-option:focus {
    background: var(--bg-highlight);
    border-color: rgba(255, 255, 255, 0.06);
    outline: none;
}

.model-option.active {
    background: var(--bg-highlight);
    border-color: var(--bg-bot);
}

.model-option-title {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 0.74rem;
    color: var(--text-primary);
}

.model-option-check {
    color: #c7d2fe;
    font-size: 0.875rem;
    flex: 0 0 auto;
}

.reasoning-chip-group {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    padding: 0 4px;
}

.reasoning-chip {
    height: 26px;
    padding: 0 12px;
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.74rem;
    transition: background-color var(--transition-fast), border-color var(--transition-fast),
        color var(--transition-fast);
}

.reasoning-chip:hover,
.reasoning-chip:focus {
    color: var(--text-primary);
    border-color: var(--bg-bot);
    outline: none;
}

.reasoning-chip.active {
    background: rgba(99, 102, 241, 0.22);
    border-color: var(--bg-bot);
    color: #e0e7ff;
}

.model-control-footer {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 2px 4px 4px;
}

.model-stat-card {
    width: 82px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    border: 1px solid rgba(255, 255, 255, 0.04);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
}

.model-stat-content {
    display: flex;
    flex-direction: column;
    width: max-content;
}

.model-stat-label {
    text-align: center;
    font-size: 0.675rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
}

.model-stat-value {
    text-align: center;
    font-size: 0.74rem;
    color: var(--text-primary);
}

/*************************************************************
    Prompt Mode Pills
    **************************************************************/
/* With a mode active the row becomes a grid: the textarea takes a full row of
   its own and the controls sit beneath it, which is what makes room for the
   pill next to the plus button. */
.input-area.prompt-mode-active .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
        "center center"
        "left   right";
    align-items: center;
    gap: var(--space-2);
}

.input-area.prompt-mode-active .row > .col {
    grid-area: center;
}

.input-area.prompt-mode-active .row > .col-auto:first-child {
    grid-area: left;
    justify-self: start;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
}

.input-area.prompt-mode-active .row > .col-auto:last-child {
    grid-area: right;
    justify-self: end;
}

.input-area.prompt-mode-active .message-input {
    width: 100%;
}

.mode-pills {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.375rem;
}

.pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.375rem;
    height: var(--control-size-sm);
    padding: var(--space-1) 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.pill:hover {
    background-color: var(--bg-secondary);
}

.pill .close {
    margin-left: 0.275rem;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    line-height: 1;
}

.pill .close:focus {
    outline: 2px solid rgba(0, 0, 0, 0.2);
    outline-offset: 1px;
}

.pill-icon {
    display: inline-flex;
    align-items: center;
    margin-right: 0.5em;
    vertical-align: middle;
}

/*************************************************************
    Input Action Control (footer)
    **************************************************************/
.action-control-btn {
    background: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    width: var(--control-size);
    height: var(--control-size);
    padding: 0;
    border: 1px solid var(--border-color) !important;
    border-radius: var(--radius-sm);
}

.action-control-btn:hover,
.action-control-btn:active,
.action-control-btn.show {
    color: var(--text-primary) !important;
    border-color: var(--bg-bot) !important;
}

.control-h-36 {
    height: 36px;
}

/* The menu opens upward out of the footer; without an explicit bottom anchor
   Bootstrap's static display leaves it clipped by the input area. */
.dropup .dropdown-menu {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    min-width: 240px;
    max-height: min(70vh, 420px);
    overflow-y: auto;
}

/* Bootstrap's light dropdown variables otherwise win for menus outside the
   composer (notably the conversation three-dot menu). Theme the shared menu
   surface once so every dropdown matches the source app. */
.dropdown-menu {
    --bs-dropdown-bg: var(--bg-secondary);
    --bs-dropdown-color: var(--text-secondary);
    --bs-dropdown-border-color: var(--border-color);
    --bs-dropdown-link-color: var(--text-secondary);
    --bs-dropdown-link-hover-color: var(--text-primary);
    --bs-dropdown-link-hover-bg: var(--bg-highlight);
    padding: 6px 2px;
    background-color: var(--bg-secondary) !important;
    border-color: var(--border-color) !important;
}

/* Buttons do not get a pointer cursor by default, and every item in this
   menu is a <button>. */
.cursor-pointer,
.dropdown-menu .dropdown-item:not(:disabled) {
    cursor: pointer;
}

.dropdown-menu .dropdown-item {
    width: 96%;
    margin: 0 auto 2px;
    padding: 2px 8px;
    /* Bootstrap's 1rem items are a size larger than the source's menus, and
       the icons, being glyphs, ride along with it. */
    font-size: 0.875rem;
    color: var(--text-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
}

.dropdown-menu .dropdown-item:hover:not(:disabled),
.dropdown-menu .dropdown-item:focus:not(:disabled),
.dropdown-menu .dropdown-item:active:not(:disabled) {
    background-color: var(--bg-highlight) !important;
    border-color: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
}

.dropdown-menu .dropdown-item:disabled {
    color: var(--text-muted);
}

.dropdown-menu .dropdown-item-danger {
    color: var(--bs-danger) !important;
}

/* Destructive choices are outlined rather than receiving the shared purple
   selection fill. This matches the source menu's separate danger treatment. */
.dropdown-menu .dropdown-item-danger:hover:not(:disabled),
.dropdown-menu .dropdown-item-danger:focus:not(:disabled) {
    background-color: transparent !important;
    border-color: var(--bs-danger) !important;
    color: var(--bs-danger) !important;
}

.dropdown-menu .dropdown-item-danger:active:not(:disabled) {
    background-color: rgba(220, 53, 69, 0.3) !important;
    border-color: var(--bs-danger) !important;
    color: var(--bs-danger) !important;
}

.dropdown-menu .dropdown-divider {
    margin: 6px 0;
    border-top-color: var(--border-color);
}

/* The conversation menu holds two short items, so the source sizes it to its
   content rather than to the shared menu's min-width. */
.sidebar-list .dropdown-menu {
    min-width: max-content;
    width: max-content;
    padding: 4px;
    white-space: nowrap;
}

.sidebar-list .dropdown-menu .dropdown-item {
    min-width: max-content;
    width: 100%;
    margin: 0;
    padding: var(--space-1) var(--space-3);
    text-align: left;
    white-space: nowrap;
}

.websearch-check {
    color: var(--bs-success);
}

/*************************************************************
    Sidebar Settings Button
    **************************************************************/
.sidebar-bottom {
    padding: 16px 8px;
    border-top: 0;
}

.sidebar-settings-btn {
    width: var(--control-size);
    height: var(--control-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: var(--radius-sm);
}

/*************************************************************
    Streaming Indicators
    **************************************************************/
/* Applied for the whole streaming lifetime, dots included: the min-width below
   depends on it, and without that the bubble collapses and the dots pile up.
   The shimmer element is what waits for the first token. overflow:hidden keeps
   the gradient inside the bubble's rounded edge. */
.bot-message.streaming {
    position: relative;
    overflow: hidden;
}

/* Gives the typing dots room before any text exists, and stops a one-word
   first token from making the bubble snap narrow then widen again. */
.bot-message.streaming .message-content {
    min-width: 4em;
}

.typing-shimmer {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background: linear-gradient(120deg,
            rgba(55, 65, 81, 0) 0%,
            rgba(99, 102, 241, 0.15) 50%,
            rgba(55, 65, 81, 0) 100%);
    animation: shimmer 1.15s infinite linear;
    z-index: 2;
}

/* Shown while waiting for the first token. An explicit three-column grid is
   used rather than relying on flex sizing: each dot owns a separate 9px track,
   so the indicator cannot collapse into three dots painted at one position. */
.typing-dots {
    display: grid;
    grid-template-columns: repeat(3, 9px);
    column-gap: 8px;
    align-items: center;
    width: 43px;
    min-width: 43px;
    margin-inline: auto;
}

.typing-dot {
    position: static;
    box-sizing: border-box;
    width: 9px;
    min-width: 9px;
    height: 9px;
    margin: 0;
    padding: 0;
    border-radius: 50%;
    background: var(--text-secondary);
    opacity: 0.5;
    display: block;
    transform-origin: center bottom;
    transform: translateY(0) scale(1);
    will-change: transform, opacity;
    animation: typing-bounce 1.25s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}

.typing-dot:nth-child(2) {
    animation-delay: 0.15s;
}

.typing-dot:nth-child(3) {
    animation-delay: 0.3s;
}

@keyframes typing-bounce {

    0%,
    80%,
    100% {
        transform: translateY(0) scale(1);
        opacity: 0.35;
    }

    40% {
        transform: translateY(-3px) scale(1.15);
        opacity: 1;
    }
}

@keyframes shimmer {
    0% {
        transform: translateX(-90%);
    }

    100% {
        transform: translateX(110%);
    }
}

/* Both indicators are decorative; users who have asked for less motion get a
   static bubble rather than a sweeping gradient. */
@media (prefers-reduced-motion: reduce) {
    .typing-shimmer {
        animation: none;
        opacity: 0.35;
    }

    .typing-dot {
        animation: none;
        opacity: 0.6;
    }
}

/*************************************************************
    Message Actions
    **************************************************************/
.message-actions {
    position: relative;
    display: flex;
    gap: 2px;
    margin-top: 4px;
    transition: opacity 0.15s ease;
}

/* The response row is separated from the answer by a rule spanning the bubble,
   as in the source template. */
.bot-message .message-actions {
    width: 100%;
    align-items: center;
    border-top: 1px solid var(--border-color);
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    /* The bubble's own p-3 would otherwise leave far more air below the row
       than the rule leaves above it. */
    margin-bottom: -0.5rem;
    min-height: 30px;
}

/* The prompt row sits under the user bubble, outside its accent fill, so it is
   revealed on hover of the whole column. Reserved space rather than
   display:none, so revealing it does not reflow what is under the cursor. */
.user-actions {
    opacity: 0;
    margin-top: 6px;
    gap: 2px;
}

.user-col:hover .user-actions,
.user-actions:focus-within {
    opacity: 1;
}

/* Outside the bubble the row sits on the page background, so the resting state
   is bare text; only the moused-over button picks up a grey plate. */
.user-actions .msg-action {
    padding: 3px 6px;
    color: var(--text-primary);
    background: transparent;
    border-color: transparent;
}

.user-actions .msg-action:hover:not(:disabled) {
    color: var(--text-primary);
    background: var(--bg-tertiary);
    border-color: transparent;
}

.msg-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    font-size: 0.75rem;
    line-height: 1;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
}

.msg-action:hover:not(:disabled) {
    color: var(--text-primary);
    background: var(--bg-tertiary);
    border-color: var(--border-color);
}

.msg-action:disabled {
    opacity: 0.4;
    cursor: default;
}

/* Touch devices have no hover, so the row would otherwise be unreachable. */
@media (hover: none) {
    .user-actions {
        opacity: 1;
    }
}

/* The user column is content-sized, so the edit form needs a floor of its own
   or the textarea collapses to its intrinsic width. */
.edit-prompt-box {
    min-width: min(420px, 60vw);
}

.edit-prompt-box textarea {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border-color: var(--border-color);
    resize: vertical;
}

.edit-prompt-box textarea:focus {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border-color: var(--bg-accent);
    box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
}

/*************************************************************
    Context Widget
    **************************************************************/
.context-widget {
    min-width: 88px;
    max-width: 120px;
    height: 37px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    transition: border-color 0.18s ease, background 0.18s ease;
}

.context-widget:hover,
.context-widget:focus {
    background: var(--bg-primary);
    border-color: var(--bg-accent);
    cursor: pointer;
}

.context-widget-bar {
    height: 6px;
    width: 100%;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
}

.context-widget-bar-fill {
    height: 100%;
    width: 0%;
    border-radius: 999px;
    background: var(--bs-success);
    transition: width 0.18s ease, background-color 0.18s ease;
}

.context-widget-body {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    line-height: 1.1;
}

.context-widget-text {
    font-size: 0.675rem;
    color: var(--text-muted);
    white-space: nowrap;
}

.context-widget.warning .context-widget-bar-fill {
    background: var(--bs-warning);
}

.context-widget.danger .context-widget-bar-fill {
    background: var(--bs-danger);
}

/* Anchored above the widget: it lives in the footer, so opening downward
   would put it off screen. */
.context-pop {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    z-index: 1060;
    min-width: 230px;
    padding: 10px 12px;
    font-size: 12px;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
    cursor: default;
}

.context-pop-title {
    font-weight: 600;
    margin-bottom: 6px;
}

.context-pop-divider {
    height: 1px;
    margin: 6px 0;
    background: var(--border-color);
}

.context-pop-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 1px 0;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.context-pop-row.muted {
    color: var(--text-muted);
}

/*************************************************************
    Citations & Embedded Sources
    **************************************************************/
.response-citations {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
    color: var(--text-muted);
    font-size: 0.72rem;
}

.citations-label {
    opacity: 0.8;
}

.citation-chip {
    padding: 1px 6px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    /* Long file names must not stretch the bubble. */
    max-width: 100%;
    overflow-wrap: anywhere;
}

/* Bounded so a large index scrolls inside the modal rather than pushing the
   Apply button off screen. */
.embedding-sources-list {
    max-height: 180px;
    overflow-y: auto;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

/* RAG settings controls, sized as in the source template: number fields are
   short, so full-width Bootstrap inputs would overstate them. */
#ragSettingsModal .form-control {
    max-width: 150px;
    font-size: 0.85rem;
    padding: 0.25em 0.25em 0.25em 0.5em;
}

#ragSettingsModal .form-label {
    font-size: 0.875rem;
    margin: 0.25em;
}

#ragSettingsModal .form-text {
    margin-left: 4px;
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: var(--text-muted);
}

.embedding-sources-list .form-check {
    padding-left: 0;
}

/*************************************************************
    Per-response Stats
    **************************************************************/
/* Anchored inside the bubble, which is position:relative, so it scrolls with
   the message instead of floating over the viewport. */
.stats-popover {
    position: absolute;
    left: 0;
    bottom: calc(100% + 6px);
    z-index: 20;
    min-width: 220px;
    margin-bottom: 0;
    padding: 10px 14px;
    font-size: 12px;
    /* The source's airy row rhythm: the rows carry no padding of their own. */
    line-height: 1.8;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(10px);
    cursor: default;
}

.stats-pop-title {
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 6px;
}

/* Rules between the groups: identity, token counts, totals. */
.stats-pop-divider {
    border-top: 1px solid var(--border-color);
    margin: 6px 0;
}

.stats-pop-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.stats-pop-label {
    color: var(--text-secondary);
}

.stats-pop-value {
    font-weight: 500;
    color: var(--text-primary);
}

.stats-pop-value.muted {
    color: var(--text-muted);
}

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

/* Holds the bubble plus, for user turns, the action row that sits below it. */
.message-col {
    display: flex;
    flex-direction: column;
    max-width: 78%;
    min-width: 0;
}

.user-col {
    align-items: flex-end;
}

.bot-col {
    align-items: flex-start;
}

.message-bubble {
    max-width: 100%;
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

.pill-icon .bi-image {
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

</style>