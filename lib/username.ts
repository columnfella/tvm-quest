// Username rules + a small profanity filter (shared by the client form and the API).
// Names are normalised (leetspeak, repeated letters, separators) before checking.

export const NAME_MIN = 3;
export const NAME_MAX = 16;

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g' };

function normalise(s: string) {
  return s
    .toLowerCase()
    .split('')
    .map((c) => LEET[c] ?? c)
    .join('')
    .replace(/(.)\1+/g, '$1'); // "fuuuck" → "fuck"
}

// Matched anywhere inside the name: long or unambiguous words.
const BANNED_ANYWHERE = [
  'fuck', 'fuk', 'fck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'penis', 'vagina', 'boob', 'tits',
  'whore', 'slut', 'bastard', 'asshole', 'arsehole', 'jackass', 'dumbass', 'nigg', 'nigga', 'niger', 'faggot',
  'retard', 'rapist', 'porn', 'hentai', 'nazi', 'hitler', 'wank', 'twat', 'bollock', 'dildo',
  'jizz', 'sperm', 'horny', 'milf', 'blowjob', 'handjob', 'motherf', 'sex', 'nude', 'naked', 'pedo',
  'molest', 'incest', 'chink', 'kike', 'tranny', 'gook', 'wetback', 'beaner', 'killyourself',
  'merde', 'connard', 'salope', 'scheisse', 'mierda', 'cabron', 'pendejo', 'cazzo', 'kurwa',
].map(normalise);

// Matched only as the whole name or a whole "word" in it (avoids "class", "document", "computer", "grape", …).
const BANNED_WORDS = [
  'ass', 'arse', 'fag', 'hoe', 'ho', 'tit', 'nig', 'gay', 'homo', 'lesbo', 'piss', 'butt', 'cum', 'anal', 'anus',
  'rape', 'cock', 'spic', 'coon', 'paki', 'kys', 'puta', 'pute', 'hure',
].map(normalise);

export function isProfane(name: string): boolean {
  if (/k{3,}/i.test(name)) return true;
  const joined = normalise(name).replace(/[^a-z]/g, '');
  const alt = normalise(name.replace(/1/g, 'l')).replace(/[^a-z]/g, ''); // "a55ho1e"
  if (BANNED_ANYWHERE.some((w) => joined.includes(w) || alt.includes(w))) return true;
  // split camelCase / digits / underscores into words: "BigAss99" → big, ass
  const parts = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z]+/)
    .map(normalise)
    .filter(Boolean);
  return [...parts, joined].some((p) => BANNED_WORDS.includes(p));
}

/** Returns an error message, or null when the name is fine. */
export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < NAME_MIN) return `At least ${NAME_MIN} characters`;
  if (name.length > NAME_MAX) return `At most ${NAME_MAX} characters`;
  if (!/^[A-Za-z0-9_]+$/.test(name)) return 'Letters, numbers and _ only';
  if (isProfane(name)) return "Let's keep it friendly. Pick another name";
  return null;
}

export const nameKey = (name: string) => name.trim().toLowerCase();
