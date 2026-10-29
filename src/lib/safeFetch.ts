import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetches a page or photo from a link someone pasted into "Save from the web". Only public
// http(s) addresses: anything that resolves to this server, the home network or a cloud
// metadata address is refused, at every redirect.

// `reached`: the website was there but its page couldn't be read (so pasting the recipe in
// is worth offering); false for links that are refused outright.
export class FetchError extends Error {
  constructor(
    message: string,
    readonly reached = false,
  ) {
    super(message);
  }
}

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 12_000;
// Says honestly what's asking. Sites that turn this away get the paste path instead.
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; RamiyasRecipes/1.0; +https://ramiyas-recipes.vercel.app)",
  "Accept-Language": "en-US,en;q=0.9",
};

function v4Private(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function privateAddress(ip: string) {
  if (isIP(ip) === 4) return v4Private(ip);
  const v6 = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return v4Private(mapped[1]);
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff") || v6.startsWith("64:ff9b:");
}

async function checkUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchError("That doesn't look like a web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchError("Only http and https links work.");
  if (url.username || url.password) throw new FetchError("Links with a username or password don't work.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchError("That link uses an unusual port.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw new FetchError("That website couldn't be found.");
  if (addresses.some(privateAddress)) throw new FetchError("That address isn't a public website.");
  return url;
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new FetchError("That file is too large.", true);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export async function safeFetch(
  raw: string,
  { accept, maxBytes }: { accept: string; maxBytes: number },
): Promise<{ url: string; contentType: string; body: Uint8Array }> {
  let url = await checkUrl(raw);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { ...HEADERS, Accept: accept },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new FetchError("That website didn't answer.", true);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = await checkUrl(new URL(location, url).href);
      continue;
    }
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new FetchError("That website doesn't let other sites read its pages.", true);
    }
    if (!res.ok) throw new FetchError(`That website answered with an error (${res.status}).`, true);
    return { url: url.href, contentType: res.headers.get("content-type") ?? "", body: await readCapped(res, maxBytes) };
  }
  throw new FetchError("That link redirects too many times.");
}

export function decodeText(body: Uint8Array, contentType: string): string {
  const charset = /charset=([\w-]+)/i.exec(contentType)?.[1];
  try {
    return new TextDecoder(charset || "utf-8").decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}
