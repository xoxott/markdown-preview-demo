<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { NAlert, NButton, NInput, NScrollbar, NSpace, NTag } from 'naive-ui';
import {
  type OllamaChatMessage,
  resolveOllamaBaseUrl,
  resolveOllamaModel,
  streamOllamaChat
} from '@/service/ai/ollamaChat';
import Markdown from '@/components/markdown';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const DEFAULT_MODEL = resolveOllamaModel();

/** 发给 Ollama 的多轮历史（含 system） */
const apiMessages = ref<OllamaChatMessage[]>([]);
const messages = ref<ChatMessage[]>([]);
const input = ref('');
const loading = ref(false);
const errorText = ref<string | null>(null);
const scrollbarRef = ref<InstanceType<typeof NScrollbar> | null>(null);
const modelInput = ref(DEFAULT_MODEL);
const showMeta = ref(true);

let sendAbort: AbortController | null = null;

const ollamaEndpointHint = computed(() => resolveOllamaBaseUrl());

function rebindSession() {
  apiMessages.value = [
    {
      role: 'system',
      content: 'You are a helpful assistant. Answer clearly and concisely.'
    }
  ];
  messages.value = [];
  errorText.value = null;
  messages.value.push({
    role: 'system',
    content: `已连接 Ollama（${ollamaEndpointHint.value}），当前模型：${modelInput.value || DEFAULT_MODEL}。开发环境请求走同源 /ollama 代理到本机 11434 端口。`
  });
}

function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  nextTick(() => {
    const inst = scrollbarRef.value;
    if (!inst) return;
    const contentEl = (inst as unknown as { $refs?: { scrollContentRef?: HTMLElement } }).$refs
      ?.scrollContentRef;
    const top = contentEl?.scrollHeight ?? 999999;
    inst.scrollTo({ top, behavior });
  });
}

watch(
  () => messages.value.length,
  () => scrollToBottom(),
  { deep: true }
);

function stopGeneration() {
  sendAbort?.abort();
  sendAbort = null;
}

async function sendMessage() {
  const prompt = input.value.trim();
  if (!prompt || loading.value) return;

  errorText.value = null;
  apiMessages.value.push({ role: 'user', content: prompt });
  messages.value.push({ role: 'user', content: prompt });
  messages.value.push({ role: 'assistant', content: '' });
  const aiIndex = messages.value.length - 1;
  input.value = '';
  loading.value = true;

  sendAbort = new AbortController();

  try {
    let full = '';
    for await (const delta of streamOllamaChat(apiMessages.value, {
      model: modelInput.value.trim() || DEFAULT_MODEL,
      signal: sendAbort.signal
    })) {
      full += delta;
      messages.value[aiIndex].content = full;
    }
    apiMessages.value.push({ role: 'assistant', content: full });
  } catch (e) {
    const err = e as Error;
    if (err?.name === 'AbortError') {
      if (!messages.value[aiIndex].content.trim()) {
        messages.value[aiIndex].content = '（已停止）';
      }
    } else {
      errorText.value = err?.message ?? String(e);
      if (!messages.value[aiIndex].content) {
        messages.value[aiIndex].content = `⚠️ ${errorText.value}`;
      }
    }
    const partial = messages.value[aiIndex].content;
    if (
      partial &&
      !partial.startsWith('⚠️') &&
      partial !== '（已停止）' &&
      apiMessages.value[apiMessages.value.length - 1]?.role === 'user'
    ) {
      apiMessages.value.push({ role: 'assistant', content: partial });
    }
  } finally {
    loading.value = false;
    sendAbort = null;
    scrollToBottom();
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    sendMessage();
  }
}

onMounted(() => {
  rebindSession();
});
</script>

<template>
  <div class="chat-page">
    <div class="chat-container">
      <div class="chat-header">
        <div class="title-row">
          <span class="title">AI 会话</span>
          <NTag size="small" type="info" :bordered="false">Ollama · 多轮对话</NTag>
        </div>
        <NSpace size="small" align="center" wrap>
          <NInput
            v-model:value="modelInput"
            size="small"
            placeholder="模型名"
            style="width: 160px"
            :disabled="loading"
          />
          <NButton size="small" :disabled="loading" @click="rebindSession">新会话</NButton>
          <NButton size="small" type="warning" :disabled="!loading" @click="stopGeneration">
            停止
          </NButton>
          <NButton size="tiny" quaternary @click="showMeta = !showMeta">
            {{ showMeta ? '隐藏说明' : '显示说明' }}
          </NButton>
        </NSpace>
      </div>

      <NAlert v-if="showMeta" type="default" class="meta-alert" closable @close="showMeta = false">
        开发环境通过 Vite 将 <code>/ollama</code> 代理到本机
        <code>localhost:11434</code>，避免浏览器跨域。生产部署请配置
        <code>VITE_OLLAMA_BASE_URL</code>（通常为同源反向代理地址）。当前 base：<strong>{{
          ollamaEndpointHint
        }}</strong>
      </NAlert>

      <NAlert v-if="errorText" type="error" closable class="meta-alert" @close="errorText = null">
        {{ errorText }}
      </NAlert>

      <NScrollbar ref="scrollbarRef" class="chat-messages" trigger="none">
        <div v-for="(msg, index) in messages" :key="index" class="msg-row" :class="msg.role">
          <div class="bubble">
            <Markdown v-if="msg.role === 'assistant'" :content="msg.content" />
            <div v-else-if="msg.role === 'user'" class="plain-text">{{ msg.content }}</div>
            <div v-else class="plain-text sys-text">{{ msg.content }}</div>
          </div>
        </div>
      </NScrollbar>

      <div class="chat-input">
        <NInput
          v-model:value="input"
          type="textarea"
          placeholder="输入问题，Ctrl/⌘ + Enter 发送"
          :disabled="loading"
          :autosize="{ minRows: 4, maxRows: 8 }"
          @keydown="handleKeydown"
        />
        <NButton
          type="primary"
          class="send-btn"
          :disabled="loading || !input.trim()"
          :loading="loading"
          @click="sendMessage"
        >
          发送
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  justify-content: center;
  align-items: stretch;
  padding: 1rem;
  min-height: calc(100vh - 120px);
  box-sizing: border-box;
  background-color: #f3f4f6;
}

.chat-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 880px;
  min-height: 520px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.chat-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
}

.meta-alert {
  margin: 0 16px 12px;
}

.meta-alert code {
  font-size: 12px;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  background: #fafafa;
  min-height: 280px;
}

.msg-row {
  display: flex;
  margin-bottom: 12px;
}

.msg-row.user {
  justify-content: flex-end;
}

.msg-row.assistant {
  justify-content: flex-start;
}

.msg-row.system {
  justify-content: center;
}

.bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 10px;
  line-height: 1.6;
  word-break: break-word;
}

.msg-row.user .bubble {
  background: rgba(24, 144, 255, 0.12);
  color: #1e3a5f;
}

.msg-row.assistant .bubble {
  background: #fffbeb;
  color: #78350f;
  border: 1px solid #fde68a;
}

.msg-row.system .bubble {
  max-width: 96%;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 13px;
}

.plain-text {
  white-space: pre-wrap;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 12px 16px 16px;
  border-top: 1px solid #e5e7eb;
  align-items: flex-end;
}

.chat-input :deep(.n-input) {
  flex: 1;
}

.send-btn {
  flex-shrink: 0;
}
</style>
