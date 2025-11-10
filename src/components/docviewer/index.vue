<script>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';

export default {
  name: 'DocViewer',
  props: {
    docFile: {
      type: String,
      default: 'README'
    }
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const rawContent = ref('');
    const showSidebar = ref(true);

    // 模块列表（根据你的实际文档结构调整）
    const modules = ref([
      { name: 'User Module', path: 'modules/user' },
      { name: 'Auth Module', path: 'modules/auth' },
      { name: 'Utils Module', path: 'modules/utils' },
      { name: 'Classes', path: 'classes' },
      { name: 'Interfaces', path: 'interfaces' }
    ]);

    const pageTitle = computed(() => {
      if (props.docFile === 'README') return 'API Documentation';
      return props.docFile
        .replace(/\//g, ' / ')
        .replace(/([A-Z])/g, ' $1')
        .trim();
    });

    // 处理 Markdown 内容，转换链接
    const processedContent = computed(() => {
      if (!rawContent.value) return '';

      let content = rawContent.value;

      // 转换相对链接为 Vue Router 链接
      content = content.replace(/\[([^\]]+)\]\(([^)]+)\.md\)/g, (match, text, link) => {
        // 移除 .md 扩展名并转换为路由路径
        const routePath = convertToRoutePath(link);
        return `<router-link to="${routePath}">${text}</router-link>`;
      });

      // 转换锚点链接
      content = content.replace(/\[([^\]]+)\]\(#([^)]+)\)/g, '<a href="#$2" class="anchor-link">$1</a>');

      // 使用 marked 解析 Markdown
      return marked(content, {
        highlight(code, lang) {
          // 可以集成代码高亮库如 Prism.js
          return `<pre><code class="language-${lang}">${code}</code></pre>`;
        }
      });
    });

    // 转换文档链接为路由路径
    function convertToRoutePath(link) {
      // 移除开头的 ./
      link = link.replace(/^\.\//, '');

      // 处理不同类型的链接
      if (link.startsWith('classes/')) {
        return `/docs/${link}`;
      } else if (link.startsWith('interfaces/')) {
        return `/docs/${link}`;
      } else if (link.startsWith('modules/')) {
        return `/docs/${link}`;
      } else if (link === 'README') {
        return '/docs';
      }
      return `/docs/${link}`;
    }

    // 处理点击链接事件
    function handleLinkClick(event) {
      const target = event.target;

      if (target.tagName === 'A' && target.classList.contains('anchor-link')) {
        event.preventDefault();
        const anchor = target.getAttribute('href').substring(1);
        const element = document.getElementById(anchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }

    // 加载文档内容
    async function loadDoc() {
      try {
        const docPath = `${props.docFile}.md`;
        // 这里需要根据你的实际情况调整文档文件的加载方式
        const response = await fetch(`/docs/${docPath}`);
        if (response.ok) {
          rawContent.value = await response.text();
        } else {
          rawContent.value = '# 文档未找到\n\n请检查文档路径是否正确。';
        }
      } catch (error) {
        console.error('加载文档失败:', error);
        rawContent.value = '# 加载错误\n\n文档加载失败，请稍后重试。';
      }
    }

    // 监听路由变化
    watch(() => props.docFile, loadDoc, { immediate: true });

    onMounted(() => {
      loadDoc();
    });

    return {
      rawContent,
      processedContent,
      showSidebar,
      modules,
      pageTitle,
      handleLinkClick
    };
  }
};
</script>

<template>
  <div class="doc-viewer">
    <div v-if="showSidebar" class="doc-sidebar">
      <nav class="doc-nav">
        <ul>
          <li>
            <RouterLink to="/docs">📖 Overview</RouterLink>
          </li>
          <li v-for="module in modules" :key="module.name">
            <RouterLink :to="`/docs/${module.path}`">
              {{ module.name }}
            </RouterLink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="doc-content" :class="{ 'with-sidebar': showSidebar }">
      <div class="doc-header">
        <button class="sidebar-toggle" @click="showSidebar = !showSidebar">☰ Menu</button>
        <h1>{{ pageTitle }}</h1>
      </div>

      <div class="markdown-content" @click="handleLinkClick" v-html="processedContent"></div>
    </div>
  </div>
</template>

<style scoped>
.doc-viewer {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
}

.doc-sidebar {
  width: 250px;
  background: white;
  border-right: 1px solid #e9ecef;
  padding: 20px;
  overflow-y: auto;
}

.doc-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.doc-nav li {
  margin-bottom: 8px;
}

.doc-nav a {
  display: block;
  padding: 8px 12px;
  text-decoration: none;
  color: #495057;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.doc-nav a:hover,
.doc-nav a.router-link-active {
  background-color: #e9ecef;
  color: #007bff;
}

.doc-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.doc-content.with-sidebar {
  margin-left: 0;
}

.doc-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.sidebar-toggle {
  background: none;
  border: none;
  font-size: 18px;
  margin-right: 15px;
  cursor: pointer;
  padding: 5px;
}

.sidebar-toggle:hover {
  background-color: #f8f9fa;
  border-radius: 4px;
}

.markdown-content {
  max-width: none;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Markdown 样式 */
.markdown-content h1,
.markdown-content h2,
.markdown-content h3 {
  color: #2c3e50;
  margin-top: 30px;
  margin-bottom: 15px;
}

.markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: white;
}

.markdown-content th,
.markdown-content td {
  padding: 12px;
  text-align: left;
  border: 1px solid #ddd;
}

.markdown-content th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.markdown-content code {
  background-color: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.markdown-content pre {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  overflow-x: auto;
}

.anchor-link {
  color: #007bff;
  text-decoration: none;
}

.anchor-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .doc-sidebar {
    position: fixed;
    left: -250px;
    top: 0;
    height: 100vh;
    z-index: 1000;
    transition: left 0.3s ease;
  }

  .doc-sidebar.show {
    left: 0;
  }

  .doc-content {
    margin-left: 0;
  }
}
</style>
