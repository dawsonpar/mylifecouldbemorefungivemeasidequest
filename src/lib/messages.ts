const FALLBACK = ["side quest accepted"];

let cache: string[] | null = null;

export async function loadAcceptanceMessages(): Promise<string[]> {
  if (cache) return cache;
  try {
    const res = await fetch("/messages.json", { cache: "no-cache" });
    if (!res.ok) {
      cache = FALLBACK;
      return cache;
    }
    const data = (await res.json()) as string[];
    cache = data.length > 0 ? data : FALLBACK;
    return cache;
  } catch {
    cache = FALLBACK;
    return cache;
  }
}

export function pickAcceptanceMessage(messages: string[]): string {
  if (messages.length === 0) return FALLBACK[0];
  return messages[Math.floor(Math.random() * messages.length)];
}
