const worker = 'https://riskpilot-api.kho24.workers.dev';
const siteKey = '0x4AAAAAAF-1q4f24kmm2dfr';

export const publicGeminiAvailable = globalThis.location?.origin === 'https://kho24.github.io';

export function setupGemini(container, status, action) {
  let widget;
  let loading;

  return async payload => {
    if (!publicGeminiAvailable) throw new Error('Public verification unavailable');
    try {
      container.hidden = false;
      status.textContent = 'Verifying your browser for Gemini…';
      loading ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(new Error('Verification unavailable'));
        };
        document.head.append(script);
      }).catch(error => {
        loading = undefined;
        throw error;
      });
      const deadline = Date.now() + 12000;
      let readyTimer;
      try {
        await Promise.race([loading, new Promise((_, reject) => {
          readyTimer = setTimeout(() => reject(new Error('Verification unavailable')), 12000);
        })]);
      } finally {
        clearTimeout(readyTimer);
      }
      widget ??= globalThis.turnstile.render(container, {sitekey: siteKey, action});
      let token;
      while (!(token = globalThis.turnstile.getResponse(widget)) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (!token) throw new Error('Verification required');

      status.textContent = 'Waiting for Gemini…';
      const response = await fetch(worker + '/api/' + action, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...payload, token}),
        signal: AbortSignal.timeout(16000)
      });
      if (!response.ok) throw new Error('Gemini unavailable');
      const {note} = await response.json();
      if (typeof note !== 'string' || !note.trim()) throw new Error('Empty Gemini response');
      status.textContent = 'Gemini responded.';
      return note.trim();
    } catch (error) {
      status.textContent = 'Gemini unavailable. Using the built-in workflow.';
      throw error;
    } finally {
      if (widget !== undefined) globalThis.turnstile.reset(widget);
    }
  };
}
