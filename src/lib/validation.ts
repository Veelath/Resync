// Checks for the sign-up and reset forms. They only decide whether a value looks right; the server still has the final say.

/** Letters from any language, with spaces, apostrophes, hyphens and periods between them. No digits or symbols. */
const NAME_RE = /^\p{L}[\p{L}\p{M} .'’\-]*$/u;

export function cleanNameInput(value: string): string {
  return value.replace(/[^\p{L}\p{M} .'’\-]/gu, '');
}

/** An error message for a name, or '' when it is fine. */
export function nameError(value: string, label: string, required = true): string {
  const name = value.trim();
  if (!name) return required ? `Enter your ${label.toLowerCase()}.` : '';
  if (!NAME_RE.test(name)) return `${label} can only have letters, spaces, hyphens and apostrophes.`;
  if (name.replace(/[^\p{L}]/gu, '').length < 2) return `${label} must have at least 2 letters.`;
  if (name.length > 60) return `${label} is too long.`;
  return '';
}

// Real addresses: letters, digits and . _ % + - before the @, then a domain with a dot and a 2+ letter ending.
const EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+\-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

// The ways people mistype gmail.com. Each one is a domain that does not exist as typed.
const GMAIL_TYPOS = new Set(['gmial.com', 'gmai.com', 'gmal.com', 'gamil.com', 'gmaill.com', 'gmail.co', 'gmail.con', 'gmail.cm',
  'gmail.om', 'gmail.comm', 'gmail.cim', 'gmail.vom', 'gmail.xom', 'gmail.coom', 'gmailcom.com', 'gmail.gmail.com', 'gnail.com', 'gmeil.com']);

/** An error message for an email, or '' when it looks right. */
export function emailError(value: string): string {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (/\s/.test(email) || !EMAIL_RE.test(email) || email.includes('..') || email.length > 254) return 'Enter a valid email address, like name@gmail.com.';
  const [local, domain] = [email.slice(0, email.lastIndexOf('@')), email.slice(email.lastIndexOf('@') + 1).toLowerCase()];
  if (local.length > 64) return 'That email address is too long.';
  if (GMAIL_TYPOS.has(domain)) return 'Did you mean gmail.com?';
  if (domain === 'gmail.com') {
    // Gmail names are 6 to 30 letters, digits or dots, never starting or ending with a dot (anything after + is ignored).
    const name = local.split('+')[0];
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9.]*[A-Za-z0-9])$/.test(name) || name.length < 6 || name.length > 30) return 'That does not look like a valid Gmail address.';
  }
  return '';
}

const KNOWN_MAIL_DOMAINS = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com']);
const mailDomainChecks = new Map<string, Promise<boolean>>();

/** True when the domain after the @ can receive mail (it publishes mail servers). Fails open if the lookup itself cannot run. */
export function mailDomainAccepts(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf('@') + 1).trim().toLowerCase();
  if (!domain || KNOWN_MAIL_DOMAINS.has(domain)) return Promise.resolve(true);
  let check = mailDomainChecks.get(domain);
  if (!check) {
    check = fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`)
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        if (!result) return true;
        if (result.Status === 3) return false; // the domain does not exist
        return Array.isArray(result.Answer) && result.Answer.length > 0 ? true : result.Status !== 0;
      })
      .catch(() => true);
    mailDomainChecks.set(domain, check);
  }
  return check;
}
