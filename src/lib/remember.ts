// What this browser remembers for Home's "Pick up where you left off": where Start Cooking was
// left, and the last recipe opened. Kept per browser (localStorage); nothing is saved online.
// Every read and write is guarded: storage can be missing or full (private browsing).

// page 0 is "Gather your ingredients", then one page per step.
export type Cooking = { slug: string; title: string; page: number; steps: number; scale: number; at: number };
export type Opened = { slug: string; title: string; at: number };

const COOKING = "rb-cooking";
const OPENED = "rb-last-recipe";
const DAY = 86_400_000;

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Cooking left more than a day ago doesn't count as "in progress" any more.
export const cooking = () => {
  const c = read<Cooking>(COOKING);
  return c && Date.now() - c.at < DAY ? c : null;
};
export const setCooking = (c: Cooking | null) => write(COOKING, c);
export const lastOpened = () => read<Opened>(OPENED);
export const setLastOpened = (o: Opened) => write(OPENED, o);
