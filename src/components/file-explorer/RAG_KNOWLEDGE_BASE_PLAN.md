# RAG 知识库系统实施计划

## 📋 项目概述

将当前文件管理器演进为类似 RAGFlow 的 RAG（Retrieval-Augmented Generation）知识库系统。核心流程：**文档上传 → 解析 → 向量化 → 语义检索 → 智能问答**。

### 核心价值

- 支持多格式文档上传和解析
- 文档内容自动向量化和索引
- 基于语义的智能检索
- 基于知识库的 RAG 问答

### 技术特点

- 模块化架构，易于扩展
- 支持多种向量数据库和 LLM
- 前后端分离，可独立部署
- 渐进式实现，MVP 优先

---

## 🏗️ 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────┐
│           前端 UI 层 (Vue 3 + TS)                │
│  - 知识库管理界面                                 │
│  - 文档上传界面                                   │
│  - 搜索界面                                      │
│  - 问答界面                                      │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│         业务逻辑层 (Composables/Hooks)            │
│  - useKnowledgeBase.ts                          │
│  - useDocumentParser.ts                         │
│  - useEmbedding.ts                              │
│  - useSemanticSearch.ts                         │
│  - useRAGQA.ts                                  │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│           服务层 (Services)                      │
│  - DocumentParserService                        │
│  - EmbeddingService                             │
│  - VectorDBService                              │
│  - SearchService                                │
│  - RAGService                                   │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│           数据源层 (Data Sources)                │
│  - IRAGDataSource                               │
│  - LocalRAGDataSource                          │
│  - ServerRAGDataSource                          │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│           存储层                                 │
│  - 向量数据库 (Milvus/Qdrant/Chroma)           │
│  - 文件存储 (本地/云端)                          │
│  - 元数据存储 (IndexedDB/数据库)                 │
└─────────────────────────────────────────────────┘
```

---

## 📦 功能模块详细设计

### 模块 1: 知识库管理

#### 功能清单

- [ ] 创建知识库（名称、描述、图标）
- [ ] 删除知识库
- [ ] 编辑知识库信息
- [ ] 知识库列表展示
- [ ] 知识库切换
- [ ] 知识库统计（文档数、总大小、索引状态）
- [ ] 知识库设置（向量模型、分块策略等）

#### 数据模型

```typescript
interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  documentCount: number;
  totalSize: number;
  status: 'active' | 'archived';
  config: KBConfig;
}

interface KBConfig {
  embeddingModel: string; // 'openai-text-embedding-3-small' | 'local-model'
  chunkSize: number; // 默认 500
  chunkOverlap: number; // 默认 50
  vectorDB: 'local' | 'milvus' | 'qdrant';
  llmProvider: 'openai' | 'claude' | 'local';
}
```

#### 组件设计

- `KnowledgeBaseManager.tsx` - 知识库管理主组件
- `KnowledgeBaseCard.tsx` - 知识库卡片
- `KnowledgeBaseSettings.tsx` - 知识库设置面板
- `KnowledgeBaseList.tsx` - 知识库列表

#### Hook 设计

```typescript
// hooks/useKnowledgeBase.ts
export function useKnowledgeBase() {
  const knowledgeBases = ref<KnowledgeBase[]>([]);
  const currentKB = ref<KnowledgeBase | null>(null);

  const createKB = async (name: string, config?: Partial<KBConfig>) => Promise<KnowledgeBase>;
  const deleteKB = async (id: string) => Promise<void>;
  const updateKB = async (id: string, updates: Partial<KnowledgeBase>) => Promise<KnowledgeBase>;
  const switchKB = async (id: string) => Promise<void>;

  return { knowledgeBases, currentKB, createKB, deleteKB, updateKB, switchKB };
}
```

---

### 模块 2: 文档上传和解析

#### 功能清单

- [ ] 文档上传（拖拽、点击、批量）
- [ ] 支持格式：PDF、Word、Markdown、TXT、Excel、PPT
- [ ] 上传进度显示
- [ ] 文档解析（提取文本、图片、表格）
- [ ] 解析状态跟踪（pending、parsing、parsed、failed）
- [ ] 解析结果预览
- [ ] 解析错误处理和重试

#### 数据模型

```typescript
interface Document extends FileItem {
  knowledgeBaseId: string;
  parseStatus: 'pending' | 'parsing' | 'parsed' | 'failed';
  parseProgress?: number; // 0-100
  parseResult?: ParseResult;
  parseError?: string;
  chunks?: DocumentChunk[];
  vectorized: boolean;
  embeddingModel?: string;
  uploadedAt: Date;
  parsedAt?: Date;
}

interface ParseResult {
  text: string;
  pages?: Page[];
  images?: Image[];
  tables?: Table[];
  metadata: {
    title?: string;
    author?: string;
    createdAt?: Date;
    pageCount?: number;
    [key: string]: any;
  };
}

interface Page {
  number: number;
  text: string;
  images?: string[]; // base64 or URLs
}
```

#### 解析器设计

```typescript
// parsers/DocumentParser.ts
interface IDocumentParser {
  parse(file: File): Promise<ParseResult>;
  canParse(file: File): boolean;
}

// 各格式解析器
class PDFParser implements IDocumentParser {}
class WordParser implements IDocumentParser {}
class MarkdownParser implements IDocumentParser {}
class TextParser implements IDocumentParser {}
class ExcelParser implements IDocumentParser {}
class PPTParser implements IDocumentParser {}
```

#### 组件设计

- `DocumentUploader.tsx` - 文档上传组件
- `DocumentList.tsx` - 文档列表
- `DocumentCard.tsx` - 文档卡片
- `ParseStatusBadge.tsx` - 解析状态标识
- `ParseResultPreview.tsx` - 解析结果预览

#### Hook 设计

```typescript
// hooks/useDocumentParser.ts
export function useDocumentParser() {
  const parseDocument = async (file: File, kbId: string) => Promise<Document>;
  const getParseStatus = async (docId: string) => Promise<ParseStatus>;
  const retryParse = async (docId: string) => Promise<void>;

  return { parseDocument, getParseStatus, retryParse };
}
```

---

### 模块 3: 文本分块

#### 功能清单

- [ ] 智能分块（按段落、章节、固定大小）
- [ ] 分块策略配置（块大小、重叠大小）
- [ ] 分块预览和编辑
- [ ] 元数据提取（标题、作者、日期）
- [ ] 分块索引管理

#### 数据模型

```typescript
interface DocumentChunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  content: string;
  metadata: {
    page?: number;
    section?: string;
    chunkIndex: number;
    [key: string]: any;
  };
  embedding?: number[];
  embeddingModel?: string;
  createdAt: Date;
}

interface ChunkingConfig {
  strategy: 'paragraph' | 'sentence' | 'fixed' | 'semantic';
  chunkSize: number; // 字符数或 token 数
  chunkOverlap: number;
  minChunkSize?: number;
  maxChunkSize?: number;
}
```

#### 分块服务设计

```typescript
// chunking/ChunkingService.ts
export class ChunkingService {
  chunk(text: string, config: ChunkingConfig): Promise<DocumentChunk[]>;
  chunkByParagraph(text: string, config: ChunkingConfig): DocumentChunk[];
  chunkBySentence(text: string, config: ChunkingConfig): DocumentChunk[];
  chunkByFixedSize(text: string, config: ChunkingConfig): DocumentChunk[];
  chunkBySemantic(text: string, config: ChunkingConfig): Promise<DocumentChunk[]>;
}
```

#### 组件设计

- `ChunkingConfigPanel.tsx` - 分块配置面板
- `ChunkPreview.tsx` - 分块预览组件
- `ChunkList.tsx` - 分块列表

---

### 模块 4: 向量化和索引

#### 功能清单

- [ ] 向量模型集成（OpenAI、本地模型）
- [ ] 批量向量生成
- [ ] 向量存储（向量数据库）
- [ ] 向量更新（文档更新时）
- [ ] 向量化进度显示
- [ ] 向量索引构建和优化

#### 数据模型

```typescript
interface EmbeddingConfig {
  model: string;
  dimensions: number;
  batchSize: number;
}

interface VectorIndex {
  knowledgeBaseId: string;
  status: 'building' | 'ready' | 'updating' | 'error';
  documentCount: number;
  vectorCount: number;
  lastUpdated: Date;
}
```

#### 向量化服务设计

```typescript
// embedding/EmbeddingService.ts
export class EmbeddingService {
  embed(text: string, model?: string): Promise<number[]>;
  embedBatch(texts: string[], model?: string): Promise<number[][]>;
  getModelInfo(model: string): ModelInfo;
}

// 支持的模型
interface ModelInfo {
  name: string;
  dimensions: number;
  maxTokens: number;
  provider: 'openai' | 'local' | 'huggingface';
}
```

#### 向量数据库接口

```typescript
// vector-db/VectorDB.ts
interface IVectorDB {
  // 集合管理
  createCollection(name: string, dimensions: number): Promise<void>;
  deleteCollection(name: string): Promise<void>;

  // 向量操作
  insert(collection: string, vectors: Vector[]): Promise<void>;
  search(collection: string, queryVector: number[], topK: number): Promise<SearchResult[]>;
  delete(collection: string, ids: string[]): Promise<void>;
  update(collection: string, vectors: Vector[]): Promise<void>;
}

interface Vector {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}
```

#### 组件设计

- `EmbeddingConfigPanel.tsx` - 向量化配置面板
- `VectorizationProgress.tsx` - 向量化进度显示
- `VectorIndexStatus.tsx` - 索引状态显示

---

### 模块 5: 语义搜索

#### 功能清单

- [ ] 语义搜索（向量相似度）
- [ ] 关键词搜索（BM25）
- [ ] 混合检索（语义 + 关键词）
- [ ] 搜索结果排序
- [ ] 搜索高亮
- [ ] 搜索结果预览
- [ ] 高级搜索（过滤、排序、时间范围）

#### 数据模型

```typescript
interface SearchResult {
  chunk: DocumentChunk;
  document: Document;
  score: number;
  highlights?: string[];
  matchType: 'semantic' | 'keyword' | 'hybrid';
}

interface SearchOptions {
  topK?: number; // 默认 10
  minScore?: number; // 相似度阈值
  filters?: SearchFilter[];
  sortBy?: 'score' | 'date' | 'relevance';
}

interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'range';
  value: any;
}
```

#### 搜索服务设计

```typescript
// search/SearchService.ts
export class SearchService {
  semanticSearch(query: string, kbId: string, options?: SearchOptions): Promise<SearchResult[]>;
  keywordSearch(query: string, kbId: string, options?: SearchOptions): Promise<SearchResult[]>;
  hybridSearch(query: string, kbId: string, options?: SearchOptions): Promise<SearchResult[]>;
  highlight(text: string, query: string): string;
}
```

#### 组件设计

- `SearchBar.tsx` - 搜索栏
- `SearchResults.tsx` - 搜索结果列表
- `SearchResultCard.tsx` - 搜索结果卡片
- `AdvancedSearchPanel.tsx` - 高级搜索面板
- `SearchFilters.tsx` - 搜索过滤器

#### Hook 设计

```typescript
// hooks/useSemanticSearch.ts
export function useSemanticSearch() {
  const searchResults = ref<SearchResult[]>([]);
  const isSearching = ref(false);

  const search = async (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  const clearResults = () => void;

  return { searchResults, isSearching, search, clearResults };
}
```

---

### 模块 6: RAG 问答系统

#### 功能清单

- [ ] 问答界面
- [ ] 问题输入和提交
- [ ] 上下文检索（相关文档块）
- [ ] 答案生成（LLM）
- [ ] 答案引用（显示来源文档和块）
- [ ] 对话历史
- [ ] 多轮对话支持
- [ ] 答案评分和反馈

#### 数据模型

```typescript
interface QAResult {
  id: string;
  question: string;
  answer: string;
  sources: SearchResult[];
  confidence?: number;
  conversationId?: string;
  createdAt: Date;
  feedback?: 'positive' | 'negative';
}

interface QAOptions {
  topK?: number; // 检索的文档块数量，默认 5
  temperature?: number; // LLM 温度，默认 0.7
  maxTokens?: number; // 最大 token 数
  stream?: boolean; // 是否流式返回
  systemPrompt?: string; // 自定义系统提示词
}

interface Conversation {
  id: string;
  knowledgeBaseId: string;
  messages: QAResult[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### RAG 服务设计

```typescript
// qa/RAGService.ts
export class RAGService {
  ask(question: string, kbId: string, options?: QAOptions): Promise<QAResult>;
  askStream(question: string, kbId: string, options?: QAOptions): AsyncGenerator<string>;
  getConversation(conversationId: string): Promise<Conversation>;
  createConversation(kbId: string): Promise<Conversation>;
  addToConversation(conversationId: string, qaResult: QAResult): Promise<void>;
}
```

#### Prompt 模板

```typescript
// qa/prompts.ts
export const DEFAULT_SYSTEM_PROMPT = `你是一个专业的AI助手，基于提供的知识库内容回答问题。

规则：
1. 只基于提供的上下文内容回答问题
2. 如果上下文不足以回答问题，请说明
3. 回答要准确、简洁、有条理
4. 在回答末尾列出参考的文档来源

上下文：
{context}

问题：{question}`;
```

#### 组件设计

- `QAPanel.tsx` - 问答主面板
- `QuestionInput.tsx` - 问题输入框
- `AnswerDisplay.tsx` - 答案显示
- `SourceReferences.tsx` - 来源引用
- `ConversationHistory.tsx` - 对话历史
- `FeedbackButton.tsx` - 反馈按钮

#### Hook 设计

```typescript
// hooks/useRAGQA.ts
export function useRAGQA() {
  const currentConversation = ref<Conversation | null>(null);
  const isAnswering = ref(false);

  const ask = async (question: string, options?: QAOptions) => Promise<QAResult>;
  const askStream = async (question: string, options?: QAOptions) => AsyncGenerator<string>;
  const createConversation = async (kbId: string) => Promise<Conversation>;
  const loadConversation = async (conversationId: string) => Promise<Conversation>;

  return { currentConversation, isAnswering, ask, askStream, createConversation, loadConversation };
}
```

---

## 🗂️ 目录结构

```
src/components/knowledge-base/
├── index.ts                          # 导出入口
│
├── knowledge-base/                   # 知识库管理
│   ├── KnowledgeBaseManager.tsx      # 知识库管理主组件
│   ├── KnowledgeBaseCard.tsx         # 知识库卡片
│   ├── KnowledgeBaseList.tsx         # 知识库列表
│   ├── KnowledgeBaseSettings.tsx     # 知识库设置
│   └── hooks/
│       └── useKnowledgeBase.ts       # 知识库管理 Hook
│
├── documents/                        # 文档管理
│   ├── DocumentUploader.tsx          # 文档上传组件
│   ├── DocumentList.tsx              # 文档列表
│   ├── DocumentCard.tsx              # 文档卡片
│   ├── ParseStatusBadge.tsx         # 解析状态标识
│   ├── ParseResultPreview.tsx       # 解析结果预览
│   └── hooks/
│       └── useDocumentParser.ts      # 文档解析 Hook
│
├── parsers/                          # 文档解析器
│   ├── DocumentParser.ts             # 解析器接口和主服务
│   ├── PDFParser.ts                  # PDF 解析器
│   ├── WordParser.ts                 # Word 解析器
│   ├── MarkdownParser.ts             # Markdown 解析器
│   ├── TextParser.ts                 # 文本解析器
│   ├── ExcelParser.ts                # Excel 解析器
│   └── PPTParser.ts                  # PPT 解析器
│
├── chunking/                         # 文本分块
│   ├── ChunkingService.ts           # 分块服务
│   ├── ChunkingConfigPanel.tsx       # 分块配置面板
│   ├── ChunkPreview.tsx              # 分块预览
│   └── ChunkList.tsx                 # 分块列表
│
├── embedding/                        # 向量化
│   ├── EmbeddingService.ts           # 向量化服务
│   ├── EmbeddingConfigPanel.tsx      # 向量化配置
│   ├── VectorizationProgress.tsx     # 向量化进度
│   └── providers/
│       ├── OpenAIEmbedding.ts        # OpenAI 向量化
│       └── LocalEmbedding.ts        # 本地向量化
│
├── vector-db/                        # 向量数据库
│   ├── VectorDB.ts                   # 向量数据库接口
│   ├── VectorDBAdapter.ts            # 适配器基类
│   ├── LocalVectorDB.ts              # 本地向量数据库（IndexedDB）
│   ├── MilvusAdapter.ts              # Milvus 适配器
│   └── QdrantAdapter.ts              # Qdrant 适配器
│
├── search/                           # 语义搜索
│   ├── SearchService.ts              # 搜索服务
│   ├── SearchBar.tsx                 # 搜索栏
│   ├── SearchResults.tsx             # 搜索结果列表
│   ├── SearchResultCard.tsx          # 搜索结果卡片
│   ├── AdvancedSearchPanel.tsx       # 高级搜索面板
│   ├── SearchFilters.tsx             # 搜索过滤器
│   └── hooks/
│       └── useSemanticSearch.ts      # 语义搜索 Hook
│
├── qa/                               # 问答系统
│   ├── RAGService.ts                 # RAG 服务
│   ├── QAPanel.tsx                   # 问答主面板
│   ├── QuestionInput.tsx             # 问题输入框
│   ├── AnswerDisplay.tsx             # 答案显示
│   ├── SourceReferences.tsx         # 来源引用
│   ├── ConversationHistory.tsx       # 对话历史
│   ├── FeedbackButton.tsx            # 反馈按钮
│   ├── prompts.ts                    # Prompt 模板
│   └── hooks/
│       └── useRAGQA.ts                # RAG 问答 Hook
│
├── types/                            # 类型定义
│   ├── knowledge-base.ts             # 知识库类型
│   ├── document.ts                   # 文档类型
│   ├── chunk.ts                      # 分块类型
│   ├── search.ts                     # 搜索类型
│   └── qa.ts                         # 问答类型
│
└── datasources/                      # 数据源
    ├── types.ts                      # 数据源接口定义
    ├── IRAGDataSource.ts             # RAG 数据源接口
    ├── LocalRAGDataSource.ts         # 本地 RAG 数据源
    └── ServerRAGDataSource.ts        # 服务器 RAG 数据源
```

---

## 🔌 数据源接口设计

### IRAGDataSource 接口

```typescript
// datasources/IRAGDataSource.ts
export interface IRAGDataSource extends IFileDataSource {
  // ==================== 知识库管理 ====================
  createKnowledgeBase(name: string, config?: Partial<KBConfig>): Promise<KnowledgeBase>;
  listKnowledgeBases(): Promise<KnowledgeBase[]>;
  getKnowledgeBase(id: string): Promise<KnowledgeBase | null>;
  updateKnowledgeBase(id: string, updates: Partial<KnowledgeBase>): Promise<KnowledgeBase>;
  deleteKnowledgeBase(id: string): Promise<void>;

  // ==================== 文档管理 ====================
  uploadDocument(file: File, kbId: string): Promise<Document>;
  listDocuments(kbId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | null>;
  deleteDocument(id: string): Promise<void>;

  // ==================== 文档解析 ====================
  parseDocument(docId: string): Promise<ParseResult>;
  getParseStatus(docId: string): Promise<ParseStatus>;
  retryParse(docId: string): Promise<void>;

  // ==================== 文本分块 ====================
  chunkDocument(docId: string, config?: ChunkingConfig): Promise<DocumentChunk[]>;
  getChunks(docId: string): Promise<DocumentChunk[]>;
  updateChunk(chunkId: string, updates: Partial<DocumentChunk>): Promise<DocumentChunk>;
  deleteChunk(chunkId: string): Promise<void>;

  // ==================== 向量化 ====================
  embedChunks(chunks: DocumentChunk[], model?: string): Promise<void>;
  embedText(text: string, model?: string): Promise<number[]>;
  getEmbeddingStatus(docId: string): Promise<EmbeddingStatus>;

  // ==================== 向量数据库 ====================
  buildIndex(kbId: string): Promise<void>;
  getIndexStatus(kbId: string): Promise<VectorIndex>;
  rebuildIndex(kbId: string): Promise<void>;

  // ==================== 搜索 ====================
  semanticSearch(query: string, kbId: string, options?: SearchOptions): Promise<SearchResult[]>;
  keywordSearch(query: string, kbId: string, options?: SearchOptions): Promise<SearchResult[]>;
  hybridSearch(query: string, kbId: string, options?: SearchOptions): Promise<SearchResult[]>;

  // ==================== 问答 ====================
  askQuestion(question: string, kbId: string, options?: QAOptions): Promise<QAResult>;
  askQuestionStream(question: string, kbId: string, options?: QAOptions): AsyncGenerator<string>;
  createConversation(kbId: string): Promise<Conversation>;
  getConversation(conversationId: string): Promise<Conversation>;
  listConversations(kbId: string): Promise<Conversation[]>;
  deleteConversation(conversationId: string): Promise<void>;
}
```

---

## 🛠️ 技术选型

### 向量数据库

| 方案               | 优点                     | 缺点                 | 适用场景             |
| ------------------ | ------------------------ | -------------------- | -------------------- |
| **Milvus**         | 功能强大、性能好、生产级 | 部署复杂、资源占用大 | 生产环境、大规模数据 |
| **Qdrant**         | 轻量级、易部署、REST API | 功能相对简单         | 中小规模、快速原型   |
| **Chroma**         | Python 生态、简单易用    | 主要面向 Python      | Python 后端          |
| **本地 IndexedDB** | 无需服务器、完全本地     | 性能有限、容量限制   | 小规模、纯前端       |

**推荐**: MVP 阶段使用本地 IndexedDB + hnswlib-js，后续迁移到 Qdrant 或 Milvus

### 向量模型

| 模型                       | 维度    | 提供商 | 适用场景         |
| -------------------------- | ------- | ------ | ---------------- |
| **text-embedding-3-small** | 1536    | OpenAI | 通用场景，成本低 |
| **text-embedding-3-large** | 3072    | OpenAI | 高质量需求       |
| **sentence-transformers**  | 384-768 | 本地   | 离线场景         |
| **Cohere Embed**           | 1024    | Cohere | 多语言场景       |

**推荐**: MVP 使用 OpenAI text-embedding-3-small，后续支持本地模型

### LLM 集成

| 方案               | 优点             | 缺点             | 适用场景   |
| ------------------ | ---------------- | ---------------- | ---------- |
| **OpenAI GPT-4**   | 质量高、API 稳定 | 成本高、需要网络 | 生产环境   |
| **OpenAI GPT-3.5** | 成本低、速度快   | 质量略低         | 开发测试   |
| **Claude**         | 质量高、长上下文 | 成本高           | 高质量需求 |
| **Ollama (本地)**  | 免费、隐私好     | 需要本地资源     | 离线场景   |

**推荐**: MVP 使用 GPT-3.5，生产环境使用 GPT-4

### 文档解析库

| 格式         | 库                | 说明                 |
| ------------ | ----------------- | -------------------- |
| **PDF**      | pdf.js、pdf-parse | 提取文本和元数据     |
| **Word**     | mammoth.js        | 转换为 HTML/Markdown |
| **Excel**    | xlsx              | 读取表格数据         |
| **PPT**      | officegen、pptx   | 提取文本和图片       |
| **Markdown** | markdown-it       | 已有，解析和渲染     |

---

## 📋 实施步骤

### Phase 1: 知识库基础架构（2-3周）

#### Week 1: 知识库管理

1. 创建知识库数据模型和类型定义
2. 实现 `useKnowledgeBase` Hook
3. 创建 `KnowledgeBaseManager` 组件
4. 实现知识库 CRUD 操作
5. 集成到文件管理器 UI

#### Week 2: 文档上传

1. 创建 `DocumentUploader` 组件
2. 实现文件上传功能（拖拽、点击、批量）
3. 添加上传进度显示
4. 实现文档列表展示
5. 集成到知识库界面

#### Week 3: 文档解析基础

1. 创建文档解析器接口
2. 实现 Markdown 和 TXT 解析器
3. 实现解析状态管理
4. 添加解析结果预览
5. 错误处理和重试机制

**交付物**: 可以创建知识库、上传文档、解析 Markdown/TXT 文档

---

### Phase 2: 文档解析扩展（2-3周）

#### Week 1: PDF 解析

1. 集成 pdf.js 或 pdf-parse
2. 实现 PDF 文本提取
3. 实现 PDF 元数据提取
4. 添加 PDF 预览功能

#### Week 2: Office 文档解析

1. 集成 mammoth.js（Word）
2. 集成 xlsx（Excel）
3. 实现 PPT 解析（可选）
4. 统一解析结果格式

#### Week 3: 解析优化

1. 实现解析任务队列
2. 添加批量解析功能
3. 优化解析性能
4. 完善错误处理

**交付物**: 支持 PDF、Word、Excel 等格式的文档解析

---

### Phase 3: 文本分块和向量化（3-4周）

#### Week 1: 文本分块

1. 实现基础分块算法（按段落、固定大小）
2. 创建分块配置面板
3. 实现分块预览功能
4. 添加分块元数据提取

#### Week 2: 向量化服务

1. 集成 OpenAI Embeddings API
2. 实现批量向量生成
3. 添加向量化进度显示
4. 实现向量缓存机制

#### Week 3: 向量数据库集成

1. 实现本地向量数据库（IndexedDB + hnswlib-js）
2. 实现向量存储和检索
3. 添加向量索引管理
4. 实现向量更新机制

#### Week 4: 向量化优化

1. 优化向量生成性能
2. 实现增量向量化
3. 添加向量化状态管理
4. 完善错误处理

**交付物**: 文档可以分块、向量化并存储到向量数据库

---

### Phase 4: 语义搜索（2-3周）

#### Week 1: 基础语义搜索

1. 实现查询向量化
2. 实现向量相似度搜索
3. 创建搜索结果展示组件
4. 添加搜索高亮功能

#### Week 2: 搜索优化

1. 实现搜索结果排序
2. 添加搜索过滤器
3. 实现高级搜索功能
4. 优化搜索性能

#### Week 3: 混合检索（可选）

1. 实现关键词索引（BM25）
2. 实现混合检索算法
3. 添加检索策略配置
4. 优化检索结果融合

**交付物**: 可以基于语义搜索文档内容

---

### Phase 5: RAG 问答系统（3-4周）

#### Week 1: 基础问答

1. 集成 LLM API（OpenAI GPT-3.5）
2. 实现 RAG 流程（检索 + 生成）
3. 创建问答界面
4. 实现答案显示和来源引用

#### Week 2: 问答优化

1. 优化 Prompt 模板
2. 实现多轮对话
3. 添加对话历史管理
4. 实现答案流式输出（可选）

#### Week 3: 问答增强

1. 添加答案评分和反馈
2. 实现答案导出功能
3. 优化答案质量
4. 添加问答统计

#### Week 4: 测试和优化

1. 完善错误处理
2. 优化性能
3. 添加加载状态
4. 完善用户体验

**交付物**: 完整的 RAG 问答系统，可以基于知识库回答问题

---

### Phase 6: 高级功能（2-3周）

#### Week 1: 文档标注

1. 实现文档标注功能
2. 添加元数据编辑
3. 实现文档分类和标签

#### Week 2: 知识库分析

1. 实现知识库统计功能
2. 添加使用分析
3. 创建统计面板

#### Week 3: 导入导出

1. 实现知识库导出
2. 实现知识库导入
3. 添加数据备份功能

**交付物**: 完整的知识库系统，包含所有核心功能

---

## 🎯 MVP 功能清单

### 必须实现（P0）

- [x] 知识库创建和管理
- [x] 文档上传（拖拽、点击）
- [x] 文档解析（PDF、Markdown、TXT）
- [x] 文本分块（基础算法）
- [x] 向量化（OpenAI Embeddings）
- [x] 向量存储（本地 IndexedDB）
- [x] 语义搜索
- [x] 基础 RAG 问答（GPT-3.5）

### 重要功能（P1）

- [ ] Word、Excel 文档解析
- [ ] 混合检索（语义 + 关键词）
- [ ] 多轮对话
- [ ] 答案流式输出
- [ ] 向量数据库迁移（Qdrant/Milvus）

### 增强功能（P2）

- [ ] 文档标注
- [ ] 知识库分析
- [ ] 导入导出
- [ ] 本地 LLM 支持
- [ ] 本地向量模型支持

---

## 📝 API 设计（服务器模式）

### 知识库 API

```
POST   /api/knowledge-bases              # 创建知识库
GET    /api/knowledge-bases              # 获取知识库列表
GET    /api/knowledge-bases/:id          # 获取知识库详情
PUT    /api/knowledge-bases/:id          # 更新知识库
DELETE /api/knowledge-bases/:id         # 删除知识库
```

### 文档 API

```
POST   /api/knowledge-bases/:kbId/documents        # 上传文档
GET    /api/knowledge-bases/:kbId/documents        # 获取文档列表
GET    /api/documents/:id                          # 获取文档详情
DELETE /api/documents/:id                          # 删除文档
POST   /api/documents/:id/parse                     # 解析文档
GET    /api/documents/:id/parse-status             # 获取解析状态
```

### 搜索 API

```
POST   /api/knowledge-bases/:kbId/search/semantic  # 语义搜索
POST   /api/knowledge-bases/:kbId/search/keyword   # 关键词搜索
POST   /api/knowledge-bases/:kbId/search/hybrid    # 混合搜索
```

### 问答 API

```
POST   /api/knowledge-bases/:kbId/qa/ask           # 提问
POST   /api/knowledge-bases/:kbId/qa/ask-stream    # 流式提问
GET    /api/conversations                           # 获取对话列表
GET    /api/conversations/:id                       # 获取对话详情
DELETE /api/conversations/:id                      # 删除对话
```

---

## 🔒 注意事项

### 性能优化

1. **大文档处理**: 使用流式解析，避免内存溢出
2. **批量操作**: 向量化、索引构建使用批量 API
3. **缓存机制**: 缓存向量、解析结果、搜索结果
4. **虚拟滚动**: 文档列表、搜索结果使用虚拟滚动
5. **懒加载**: 按需加载文档内容、分块

### 错误处理

1. **解析失败**: 提供重试机制，记录错误信息
2. **向量化失败**: 支持重试，提供降级方案
3. **搜索超时**: 设置超时时间，提供友好提示
4. **API 限流**: 处理 API 限流，实现重试和退避

### 数据安全

1. **数据加密**: 敏感数据加密存储
2. **访问控制**: 实现知识库权限管理
3. **数据备份**: 定期备份向量数据和元数据
4. **隐私保护**: 本地模式支持完全离线

### 用户体验

1. **加载状态**: 所有异步操作显示加载状态
2. **进度显示**: 上传、解析、向量化显示进度
3. **错误提示**: 友好的错误提示和解决建议
4. **操作反馈**: 所有操作提供即时反馈

---

## 📚 参考资料

- [RAGFlow 官方文档](https://ragflow.org/)
- [LangChain 文档](https://python.langchain.com/)
- [Milvus 文档](https://milvus.io/docs)
- [Qdrant 文档](https://qdrant.tech/documentation/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Vector Database Comparison](https://www.pinecone.io/learn/vector-database/)

---

## ✅ 检查清单

### 开发前检查

- [ ] 确认技术选型
- [ ] 准备开发环境
- [ ] 申请 API Key（OpenAI 等）
- [ ] 设计数据库 schema
- [ ] 准备测试数据

### 开发中检查

- [ ] 代码符合规范
- [ ] 类型定义完整
- [ ] 错误处理完善
- [ ] 性能测试通过
- [ ] 单元测试覆盖

### 发布前检查

- [ ] 功能测试完整
- [ ] 性能优化完成
- [ ] 文档更新完成
- [ ] 用户体验优化
- [ ] 安全审查通过

---

**文档版本**: v1.0  
**最后更新**: 2025-01-XX  
**维护者**: 开发团队
