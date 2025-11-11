<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from 'vue';
import { NButton, NInput, NScrollbar, NSpin } from 'naive-ui';
import { callOllamaStream } from '@/hooks/customer/useOllamaStrem';
import { MarkdownPreview } from '@/components/markdown';

interface Message {
  role: 'user' | 'ai';
  content: string;
  displayContent?: string;
}

const input = ref('');
const messages = ref<Message[]>([]);
const loading = ref(false);
const typingSpeed = 20;
const typingQueue = ref<{ index: number; token: string }[]>([]);
const isTyping = ref(false);
const scrollbarRef = ref<InstanceType<typeof NScrollbar> | null>(null);
const userScrollingUp = ref(false);
const scrollPosition = ref(0);

// 自动滚动控制
const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  if (userScrollingUp.value) return;

  nextTick(() => {
    const scrollbarInstance = scrollbarRef.value;
    if (scrollbarInstance) {
      const contentEl = (scrollbarInstance as any).$refs?.scrollContentRef as HTMLElement | undefined;
      const scrollHeight = contentEl?.scrollHeight || 999999;
      scrollbarInstance.scrollTo({
        top: scrollHeight,
        behavior
      });
    }
  });
};

// 处理滚动事件
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const currentScrollPos = target.scrollTop;
  const scrollHeight = target.scrollHeight;
  const clientHeight = target.clientHeight;

  // 检测用户是否向上滚动
  userScrollingUp.value = currentScrollPos < scrollPosition.value;

  // 如果接近底部，恢复自动滚动
  if (scrollHeight - (currentScrollPos + clientHeight) < 50) {
    userScrollingUp.value = false;
  }

  scrollPosition.value = currentScrollPos;
};

// 逐字打印效果
const typeWriter = () => {
  if (typingQueue.value.length === 0 || isTyping.value) return;

  isTyping.value = true;
  const { index, token } = typingQueue.value.shift()!;

  if (!messages.value[index].displayContent) {
    messages.value[index].displayContent = '';
  }

  let charIndex = 0;
  const typingInterval = setInterval(() => {
    if (charIndex < token.length) {
      messages.value[index].displayContent += token.charAt(charIndex);
      charIndex++;
      // scrollToBottom('auto')
    } else {
      clearInterval(typingInterval);
      isTyping.value = false;

      nextTick(() => {
        if (typingQueue.value.length > 0) {
          typeWriter();
        }
      });
    }
  }, typingSpeed);
};

// 发送消息
const sendMessage = async () => {
  const prompt = input.value.trim();
  if (!prompt) return;

  messages.value.push({
    role: 'user',
    content: prompt,
    displayContent: prompt
  });
  input.value = '';
  loading.value = true;

  const aiMessage = {
    role: 'ai' as const,
    content: '',
    displayContent: '▋'
  };
  messages.value.push(aiMessage);
  const aiIndex = messages.value.length - 1;

  // scrollToBottom()

  try {
    await callOllamaStream(prompt, (token: string) => {
      typingQueue.value.push({
        index: aiIndex,
        token
      });
      messages.value[aiIndex].content += token;

      if (!isTyping.value) {
        typeWriter();
      }
    });
  } catch (err) {
    messages.value[aiIndex].displayContent = '⚠️ AI 响应失败';
    console.error(err);
  } finally {
    if (messages.value[aiIndex].displayContent?.endsWith('▋')) {
      messages.value[aiIndex].displayContent = messages.value[aiIndex].displayContent.slice(0, -1);
    }
    loading.value = false;
  }
};

// 初始化
// onMounted(() => {
//   scrollToBottom('auto')
// })

// 监听消息变化
// watch(
//   () => messages.value.length,
//   () => scrollToBottom(),
//   { deep: true }
// )
</script>

<template>
  <div class="chat-page">
    <div class="chat-container">
      <NScrollbar ref="scrollbarRef" class="chat-messages" trigger="none" @scroll="handleScroll">
        <div v-for="(msg, index) in messages" :key="index" class="message" :class="[msg.role]">
          <MarkdownPreview :content="msg.content" />
        </div>
        <div v-if="loading" class="message ai loading">
          <NSpin size="small" />
        </div>
      </NScrollbar>

      <div class="chat-input">
        <NInput
          v-model:value="input"
          type="textarea"
          placeholder="请输入你的问题..."
          :disabled="loading"
          :autosize="{
            minRows: 5,
            maxRows: 5
          }"
        />
        <NButton type="primary" :disabled="loading || !input.trim()" :loading="loading" @click="sendMessage">
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
  align-items: center;
  padding: 2rem;
  height: 100vh;
  background-color: #f3f4f6;
  box-sizing: border-box;
}

.chat-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  height: 100%;
  max-height: 80vh;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  background: #fafafa;
}

.message {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  max-width: 80%;
  word-break: break-word;
  line-height: 1.6;
  opacity: 0;
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.message.user {
  align-self: flex-end;
  background-color: var(--n-color-primary-light);
  color: var(--n-text-color-primary);
  animation-delay: 0.1s;
}

.message.ai {
  align-self: flex-start;
  background-color: #fef9c3;
  color: #92400e;
  animation-delay: 0.2s;
}

.message.loading {
  background-color: #f3f4f6;
  display: flex;
  justify-content: center;
}

.chat-input {
  display: flex;
  padding: 16px;
  border-top: 1px solid var(--n-divider-color);
  background-color: #fff;
  gap: 12px;
  align-items: flex-end;
}

.chat-input :deep(.n-input) {
  flex: 1;
}

.chat-input :deep(.n-button) {
  height: 40px;
  margin-bottom: 4px;
}
</style>
