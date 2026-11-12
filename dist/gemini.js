const endpoint = 'https://riskpilot-api.kho24.workers.dev/api/risk-note';
const siteKey = '0x4AAAAAAF-1q4f24kmm2dfr';

export function setupGemini(toggle, container, status) {
  let widget;
  let loading;
  toggle.addEventListener('change', async () => {
    container.hidden = !toggle.checked;
    if (!toggle.checked || widget !== undefined) return;
    try {
      loading ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      await loading;
      if (!toggle.checked || widget !== undefined) return;
      widget = globalThis.turnstile.render(container, {sitekey: siteKey, action: 'risk-note'});
    } catch {
      status.textContent = 'Gemini verification unavailable. The assessment still works.';
    }
  });

  return async (cve, score) => {
    const token = widget === undefined ? '' : globalThis.turnstile.getResponse(widget);
    if (!token) throw new Error('Verification required');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({cve, score, token}),
        signal: AbortSignal.timeout(16000)
      });
      if (!response.ok) throw new Error('Gemini unavailable');
      const {note} = await response.json();
      if (typeof note !== 'string' || !note.trim()) throw new Error('Empty Gemini note');
      return note.trim().slice(0, 600);
    } finally {
      globalThis.turnstile.reset(widget);
    }
  };
}
