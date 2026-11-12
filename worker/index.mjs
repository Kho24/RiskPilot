const origin = 'https://kho24.github.io';
const cors = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

function reply(status, body) {
  return Response.json(body, {status, headers: cors});
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/risk-note') return reply(404, {error: 'Not found'});
    if (request.headers.get('Origin') !== origin) return reply(403, {error: 'Origin denied'});
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    if (request.method !== 'POST') return reply(405, {error: 'Method not allowed'});
    if (!env.GEMINI_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.NOTE_RATE_LIMIT) {
      return reply(503, {error: 'Gemini note unavailable'});
    }
    if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') {
      return reply(415, {error: 'JSON required'});
    }

    try {
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return reply(403, {error: 'Request denied'});
      const {success: allowed} = await env.NOTE_RATE_LIMIT.limit({key: ip});
      if (!allowed) return reply(429, {error: 'Try again in a minute'});

      const reader = request.body?.getReader();
      if (!reader) return reply(400, {error: 'Missing request body'});
      const decoder = new TextDecoder();
      let size = 0;
      let body = '';
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return reply(413, {error: 'Request too large'});
        }
        body += decoder.decode(value, {stream: true});
      }
      let input;
      try { input = JSON.parse(body + decoder.decode()); }
      catch { return reply(400, {error: 'Invalid JSON'}); }
      if (!input || typeof input !== 'object' || Object.keys(input).length !== 3
        || typeof input.cve !== 'string' || !/^CVE-\d{4}-\d{4,20}$/.test(input.cve)
        || !Number.isFinite(input.score) || input.score < 0 || input.score > 10
        || typeof input.token !== 'string' || !input.token || input.token.length > 2048) {
        return reply(400, {error: 'Invalid request'});
      }

      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({secret: env.TURNSTILE_SECRET_KEY, response: input.token, remoteip: ip}),
        signal: AbortSignal.timeout(4000)
      });
      if (!verification.ok) return reply(503, {error: 'Verification unavailable'});
      const challenge = await verification.json();
      if (!challenge.success || challenge.hostname !== 'kho24.github.io' || challenge.action !== 'risk-note') {
        return reply(403, {error: 'Verification required'});
      }

      const model = encodeURIComponent(env.GEMINI_MODEL);
      const result = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY},
        body: JSON.stringify({
          systemInstruction: {parts: [{text: 'Write a brief defensive risk note in plain text. Explain that CVSS describes the vulnerability and asset impact depends on exposure and applicability. Use only the provided CVE ID and score. Do not give exploit details, testing instructions, commands, or unsupported facts. Use at most two short sentences.'}]},
          contents: [{parts: [{text: JSON.stringify({cve: input.cve, cvss: input.score})}]}],
          generationConfig: {maxOutputTokens: 256, thinkingConfig: {thinkingBudget: 0}}
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!result.ok) return reply(502, {error: 'Gemini note unavailable'});
      const data = await result.json();
      const note = data.candidates?.[0]?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string')
        .map(part => part.text).join(' ').trim().slice(0, 600);
      return note ? reply(200, {note}) : reply(502, {error: 'Gemini note unavailable'});
    } catch {
      return reply(503, {error: 'Gemini note unavailable'});
    }
  }
};
