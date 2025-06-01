import * as monaco from 'monaco-editor-core'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine-javascript.mjs'
import { shikiToMonaco } from '@shikijs/monaco'

/** 语言 */
import langVue from 'shiki/langs/vue.mjs'
import langTsx from 'shiki/langs/tsx.mjs'
import langJsx from 'shiki/langs/jsx.mjs'
import langJs from 'shiki/langs/js.mjs'
import langTs from 'shiki/langs/ts.mjs'

/** 主题 */
import themeDark from 'shiki/themes/dark-plus.mjs'
import themeLight from 'shiki/themes/light-plus.mjs'

let registered = false
export function registerHighlighter() {
  if (!registered) {
    const highlighter = createHighlighterCoreSync({
      themes: [themeDark, themeLight],
      langs: [langVue, langTsx, langJsx,langJs,langTs],
      engine: createJavaScriptRegexEngine(),
    })
    monaco.languages.register({ id: 'vue' })
    monaco.languages.register({ id: 'tsx' })
    monaco.languages.register({ id: 'jsx' })
    monaco.languages.register({ id: 'javascript' })
    monaco.languages.register({ id: 'typescript' })
    shikiToMonaco(highlighter, monaco)
    registered = true
  }

  return {
    light: themeLight.name!,
    dark: themeDark.name!,
  }
}