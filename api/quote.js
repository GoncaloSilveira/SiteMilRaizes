// api/quote.js — Vercel Serverless Function
// POST /api/quote
//
// Layers of protection (in order):
//   1. Method guard       — only POST allowed
//   2. CORS               — only requests from the deployed domain
//   3. Rate limiting      — max N requests per IP per time window (in-memory)
//   4. Honeypot           — bots fill the hidden "website" field; we reject silently
//   5. Schema validation  — zod validates types, lengths, email format
//   6. Sanitisation       — strips HTML tags from free-text fields
//   7. Email via Resend   — sends a formatted email to CONTACT_EMAIL

const { Resend } = require('resend');
const { z } = require('zod');

// ─── Rate limiter (in-memory, resets on cold start) ───────────────────────────
// Vercel functions are stateless; for a small contact form this is sufficient.
// If you need persistence across instances, replace with Vercel KV or Upstash.
const ipMap = new Map();
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000; // 1h
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 3;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipMap.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }

  entry.count += 1;
  ipMap.set(ip, entry);

  return entry.count > MAX_REQUESTS;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const QuoteSchema = z.object({
  // Honeypot — must be empty; bots typically fill every visible field
  website: z.string().max(0, 'bot_detected').optional().default(''),

  services: z
    .array(z.string().max(80))
    .min(1, 'Selecione pelo menos um serviço.')
    .max(10),
  typology: z.string().min(1, 'Selecione a tipologia.').max(80),
  area:     z.string().min(1, 'Selecione a dimensão.').max(80),
  timing:   z.string().min(1, 'Selecione o timing.').max(80),

  name:  z.string().min(1, 'Nome obrigatório.').max(120),
  email: z.string().email('Email inválido.').max(254),
  phone: z.string().max(30).optional().default(''),
  notes: z.string().max(2000).optional().default(''),
});

// ─── Sanitise ─────────────────────────────────────────────────────────────────
// Strips HTML tags from any string to prevent email header injection / XSS
// in the email body.
function strip(value) {
  return String(value).replace(/<[^>]*>/g, '').trim();
}

// ─── Email template ───────────────────────────────────────────────────────────
function buildEmailHtml(data) {
  const row = (label, value) =>
    value
      ? `<tr>
           <td style="padding:10px 16px;font-weight:600;color:#2F6B2A;white-space:nowrap;vertical-align:top;font-family:monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;width:160px">${label}</td>
           <td style="padding:10px 16px;color:#29261b;font-size:14px;line-height:1.5">${value}</td>
         </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><title>Novo pedido de orçamento</title></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:'Inter',ui-sans-serif,system-ui,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#fff;border:1px solid #e2ded6">

    <div style="background:#2F6B2A;padding:32px 40px">
      <p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.7)">Mil Raízes · Novo pedido</p>
      <h1 style="margin:12px 0 0;font-size:28px;font-weight:300;color:#fff;letter-spacing:-.01em">Pedido de Orçamento</h1>
    </div>

    <table style="width:100%;border-collapse:collapse;border-top:3px solid #7DB93C">
      <tbody>
        ${row('Nome', strip(data.name))}
        ${row('Email', strip(data.email))}
        ${row('Telefone', data.phone ? strip(data.phone) : '')}
        ${row('Serviços', data.services.map(strip).join('<br>'))}
        ${row('Tipologia', strip(data.typology))}
        ${row('Dimensão', strip(data.area))}
        ${row('Timing', strip(data.timing))}
        ${row('Notas', data.notes ? strip(data.notes) : '')}
      </tbody>
    </table>

    <div style="padding:24px 40px;border-top:1px solid #e2ded6;background:#f7f5f0">
      <p style="margin:0;font-size:12px;color:#6b6b66;font-family:monospace;letter-spacing:.06em">
        Enviado via milraizes.pt · ${new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}
      </p>
    </div>

  </div>
</body>
</html>`;
}

function buildEmailText(data) {
  return [
    'NOVO PEDIDO DE ORÇAMENTO — MIL RAÍZES',
    '─'.repeat(40),
    `Nome:      ${strip(data.name)}`,
    `Email:     ${strip(data.email)}`,
    `Telefone:  ${data.phone ? strip(data.phone) : '—'}`,
    `Serviços:  ${data.services.map(strip).join(', ')}`,
    `Tipologia: ${strip(data.typology)}`,
    `Dimensão:  ${strip(data.area)}`,
    `Timing:    ${strip(data.timing)}`,
    `Notas:     ${data.notes ? strip(data.notes) : '—'}`,
    '─'.repeat(40),
    `Enviado: ${new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}`,
  ].join('\n');
}

// ─── Handler ──────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // 1. Method guard
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // 2. CORS — allow same-origin and the Vercel preview URLs
  const origin = req.headers.origin || '';
  const allowed =
    process.env.NODE_ENV === 'development' ||
    origin === `https://${process.env.VERCEL_URL}` ||
    /^https:\/\/milraizes\.pt$/.test(origin) ||
    /^https:\/\/.*\.vercel\.app$/.test(origin);

  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 3. Rate limit
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Demasiados pedidos. Tente novamente mais tarde.',
    });
  }

  // 4–5. Validate (honeypot check is inside the schema)
  const parsed = QuoteSchema.safeParse(req.body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    // Honeypot triggered — respond 200 to not tip off the bot
    if (firstIssue?.message === 'bot_detected') {
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: firstIssue?.message || 'Dados inválidos.' });
  }

  const data = parsed.data;

  // 6. Send email via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from:    'Mil Raízes Site <onboarding@resend.dev>',
      to:      [process.env.CONTACT_EMAIL || 'milraizes@milraizes.pt'],
      replyTo: strip(data.email),
      subject: `Orçamento · ${strip(data.name)} · ${data.services[0]}`,
      html:    buildEmailHtml(data),
      text:    buildEmailText(data),
    });
  } catch (err) {
    console.error('[quote] resend error:', err);
    return res.status(502).json({
      error: 'Não foi possível enviar o pedido. Tente novamente ou contacte-nos diretamente.',
    });
  }

  return res.status(200).json({ ok: true });
};
