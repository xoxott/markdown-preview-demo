import { type Uri, editor } from 'monaco-editor-core';

/**
 * Retrieves or creates a Monaco editor model based on the provided URI, language, and value.
 *
 * @param {Uri} uri - The unique identifier for the model.
 * @param {string | undefined} lang - The language of the model.
 * @param {string} value - The initial value of the model.
 * @returns {Object} The retrieved or created Monaco editor model.
 */
export function getOrCreateModel(uri: Uri, lang: string | undefined, value: string) {
  const model = editor.getModel(uri);
  if (model) {
    model.setValue(value);
    return model;
  }
  return editor.createModel(value, lang, uri);
}
