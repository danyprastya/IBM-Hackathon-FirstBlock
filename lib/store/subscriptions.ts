// Reference-counted Firestore subscription registry.
//
// Multiple components requesting the same data share a single onSnapshot
// listener. The first refSubscribe call mounts; subsequent calls bump the
// refCount; when refCount hits 0 the listener is torn down.
//
// Sub keys must be unique per (collection-path × query). Callers compose
// keys like `problems:${uid}` or `researches:${uid}:${problemId}`.

interface Entry {
  unsub: () => void;
  refCount: number;
}

const subs = new Map<string, Entry>();

/**
 * Mount a Firestore subscription if not already mounted, increment its
 * ref count, and return an unsub fn that decrements (and tears down on 0).
 */
export function refSubscribe(key: string, mount: () => () => void): () => void {
  let entry = subs.get(key);
  if (!entry) {
    entry = { unsub: mount(), refCount: 0 };
    subs.set(key, entry);
  }
  entry.refCount++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    entry!.refCount--;
    if (entry!.refCount <= 0) {
      entry!.unsub();
      subs.delete(key);
    }
  };
}

/** For tests / debugging — not used in production. */
export function _resetSubscriptions(): void {
  for (const entry of subs.values()) entry.unsub();
  subs.clear();
}

// Made with Bob
