import {readFile} from 'node:fs/promises';
import {Element} from './workbench.mjs';
import {createApiFixture} from './api-fixture.mjs';

let trial = 0;

export async function exerciseChat(testCase) {
  const page = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const nodes = new Map([...page.matchAll(/<([\w-]+)\b([^>]*?\bid="([^"]+)"[^>]*)>/g)].map(([, tag, attrs, id]) => {
    const node = new Element(tag);
    node.checked = /\bchecked\b/.test(attrs);
    return [id, node];
  }));
  const get = id => {
    if (!nodes.has(id)) throw new Error('Missing chat element ' + id);
    return nodes.get(id);
  };
  get('chat-form').reset = () => { get('question').value = ''; };
  const api = createApiFixture(testCase.options);
  const saved = {document: globalThis.document, location: globalThis.location, fetch: globalThis.fetch, turnstile: globalThis.turnstile};
  try {
    globalThis.location = {origin: 'https://kho24.github.io'};
    globalThis.document = {
      getElementById: get,
      createElement: tag => new Element(tag),
      head: {append: script => queueMicrotask(() => script.onload())}
    };
    globalThis.turnstile = api.turnstile;
    globalThis.fetch = api.fetch;
    const chatUrl = new URL('../dist/chat.js', import.meta.url);
    let source = await readFile(chatUrl, 'utf8');
    for (const name of ['scenarios', 'practice', 'demos', 'gemini']) {
      const url = new URL(name + '.js', chatUrl);
      if (name === 'gemini') url.search = 'chat-trial=' + ++trial;
      source = source.replace("'./" + name + ".js'", JSON.stringify(url.href));
    }
    await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64') + '#trial=' + ++trial);
    const messages = testCase.messages ?? [testCase.message ?? 'How do I recognize phishing?'];
    for (const message of messages) {
      get('question').value = message;
      const first = get('chat-form').dispatch('submit');
      if (testCase.concurrent) {
        get('question').value = message;
        await get('chat-form').dispatch('submit');
      }
      await first;
    }
    return {
      status: get('chat-gemini-status').textContent,
      turns: get('conversation').children.map(turn => ({
        speaker: turn.children[0].textContent,
        text: turn.children[1].children.filter(node => node.tag === 'p').map(node => node.textContent).join('\n'),
        links: turn.children[1].children.filter(node => node.tag === 'a').map(node => node.href)
      })),
      calls: api.calls,
      controlsEnabled: !get('question').disabled && !get('chat-gemini').disabled,
      formVisible: !get('chat-form').hidden
    };
  } finally {
    Object.assign(globalThis, saved);
  }
}
