/**
 * 内置 Skill: /lorem-ipsum — 长上下文测试填充文本生成器
 *
 * 对齐 CC src/skills/bundled/loremIpsum.ts。生成约 N 个 token 的英文文本用于 长上下文测试。所有词都是已验证的 1-token 词。
 */

import { registerBundledSkill } from './BundledSkill';

// 已验证的 1-token 英文词（通过 API token 计数测试）
const ONE_TOKEN_WORDS: readonly string[] = [
  // Articles & pronouns
  'the',
  'a',
  'an',
  'I',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'its',
  'our',
  'this',
  'that',
  'what',
  'who',
  // Common verbs
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'can',
  'could',
  'may',
  'might',
  'must',
  'shall',
  'should',
  'make',
  'made',
  'get',
  'got',
  'go',
  'went',
  'come',
  'came',
  'see',
  'saw',
  'know',
  'take',
  'think',
  'look',
  'want',
  'use',
  'find',
  'give',
  'tell',
  'work',
  'call',
  'try',
  'ask',
  'need',
  'feel',
  'seem',
  'leave',
  'put',
  // Common nouns & adjectives
  'time',
  'year',
  'day',
  'way',
  'man',
  'thing',
  'life',
  'hand',
  'part',
  'place',
  'case',
  'point',
  'fact',
  'good',
  'new',
  'first',
  'last',
  'long',
  'great',
  'little',
  'own',
  'other',
  'old',
  'right',
  'big',
  'high',
  'small',
  'large',
  'next',
  'early',
  'young',
  'few',
  'public',
  'bad',
  'same',
  'able',
  // Prepositions & conjunctions
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'from',
  'by',
  'about',
  'like',
  'through',
  'over',
  'before',
  'between',
  'under',
  'since',
  'without',
  'and',
  'or',
  'but',
  'if',
  'than',
  'because',
  'as',
  'until',
  'while',
  'so',
  'though',
  'both',
  'each',
  'when',
  'where',
  'why',
  'how',
  // Common adverbs
  'not',
  'now',
  'just',
  'more',
  'also',
  'here',
  'there',
  'then',
  'only',
  'very',
  'well',
  'back',
  'still',
  'even',
  'much',
  'too',
  'such',
  'never',
  'again',
  'most',
  'once',
  'off',
  'away',
  'down',
  'out',
  'up',
  // Tech/common
  'test',
  'code',
  'data',
  'file',
  'line',
  'text',
  'word',
  'number',
  'system',
  'program',
  'set',
  'run',
  'value',
  'name',
  'type',
  'state',
  'end',
  'start'
];

const MAX_TOKENS_CAP = 500_000;
const DEFAULT_TARGET_TOKENS = 10_000;

export function generateLoremIpsum(targetTokens: number): string {
  let tokens = 0;
  let result = '';

  while (tokens < targetTokens) {
    const sentenceLength = 10 + Math.floor(Math.random() * 11);
    let wordsInSentence = 0;

    for (let i = 0; i < sentenceLength && tokens < targetTokens; i += 1) {
      const word = ONE_TOKEN_WORDS[Math.floor(Math.random() * ONE_TOKEN_WORDS.length)] ?? 'the';
      result += word;
      tokens += 1;
      wordsInSentence += 1;

      if (i === sentenceLength - 1 || tokens >= targetTokens) {
        result += '. ';
      } else {
        result += ' ';
      }
    }

    if (wordsInSentence > 0 && Math.random() < 0.2 && tokens < targetTokens) {
      result += '\n\n';
    }
  }

  return result.trim();
}

export function registerLoremIpsumSkill(): void {
  registerBundledSkill({
    name: 'lorem-ipsum',
    description:
      'Generate filler text for long context testing. Specify token count as argument (e.g., /lorem-ipsum 50000).',
    argumentHint: '[token_count]',
    userInvocable: true,
    async getPromptForCommand(args) {
      const parsed = Number.parseInt(args, 10);

      if (args && (Number.isNaN(parsed) || parsed <= 0)) {
        return [
          {
            type: 'text',
            text: 'Invalid token count. Please provide a positive number (e.g., /lorem-ipsum 10000).'
          }
        ];
      }

      const targetTokens = parsed || DEFAULT_TARGET_TOKENS;
      const cappedTokens = Math.min(targetTokens, MAX_TOKENS_CAP);

      const prefix =
        cappedTokens < targetTokens
          ? `Requested ${targetTokens} tokens, but capped at ${MAX_TOKENS_CAP.toLocaleString()} for safety.\n\n`
          : '';

      return [{ type: 'text', text: prefix + generateLoremIpsum(cappedTokens) }];
    }
  });
}
