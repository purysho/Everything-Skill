const sensitive = String.raw`(?:\.env\b|credentials|api[ _-]?keys?|access[ _-]?tokens?|private\s+(?:ssh\s+)?keys?|id_ed25519)`;
const destination = String.raw`(?:https?:\/\/|external\s+endpoint)`;
const gap = String.raw`[^\r\n]{0,120}`;
const transfer = String.raw`(?:send|upload|exfiltrate|transmit|forward|post|paste)`;

const rules = [
  { code: 'prompt-injection', level: 'warning', pattern: /ignore\s+(?:all\s+)?(?:previous|prior|system)\s+instructions|reveal\s+(?:the\s+)?system\s+prompt/i },
  { code: 'credential-abuse', level: 'blocked', pattern: new RegExp(
    String.raw`\b${transfer}\b${gap}(?:${sensitive}${gap}${destination}|${destination}${gap}${sensitive})`, 'i') },
  { code: 'credential-abuse', level: 'blocked',
    pattern: /\bcurl\b[^\r\n]{0,200}(?:--data(?:-binary|-raw)?|-d)\s+["']?@(?:[^\s"']*\/)?(?:\.env|id_ed25519)\b/i },
  { code: 'malware', level: 'blocked', pattern: /(?:\b(?:install|deploy|run)\b[^\r\n]{0,40}(?:credential stealer|ransomware payload)|disable windows defender and run|xmrig\b.*--donate-level)/i },
  { code: 'dangerous-permissions', level: 'blocked', pattern: /--privileged\b[^\r\n]{0,120}(?:\/var\/run\/docker\.sock|\/\s*:\s*\/host\b)|(?:unrestricted|arbitrary)\s+(?:shell|command)\s+execution[^\r\n]{0,80}without\s+(?:approval|confirmation)/i },
  { code: 'suspicious-install', level: 'warning', pattern: /(?:curl|wget)[^\r\n]{1,160}\|\s*(?:ba)?sh\b|(?:npm|pnpm)\s+install[^\r\n]{0,160}(?:https?:\/\/|git\+ssh:)/i },
  { code: 'scam-or-illegal', level: 'blocked', pattern: /(?:steal|harvest)\s+(?:credit card|bank login)\s+(?:numbers|credentials)|guaranteed\s+(?:daily|weekly)\s+returns[^\r\n]{0,80}(?:wallet|deposit)/i },
] as const;

export type SurfaceFlag = typeof rules[number]['code'];

export function inspectSurface(content: string) {
  const normal = content.slice(0, 256_000).normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '');
  const actionable = normal.replace(new RegExp(
    String.raw`\b(?:never|do not|don't|must not)\s+(?:(?:ever|directly)\s+)?(?:${transfer}|run\s+curl|install|deploy|run)\b`, 'gi'),
  '[prohibited action]');
  const matches = rules.filter((rule) => rule.pattern.test(rule.level === 'blocked' ? actionable : normal));
  return {
    flags: [...new Set(matches.map(({ code }) => code))],
    blocked: matches.some(({ level }) => level === 'blocked'),
  };
}
