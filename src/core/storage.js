/**
 * SHOOT! — Data access layer.
 *
 * NOTHING in the game touches localStorage directly. Everything goes through
 * the `Store` driver below, whose four methods (read / write / remove / keys)
 * are all async and all promise-based — which means the day the game moves to a
 * remote database (for accounts, cloud saves and the online mode), the only
 * file that changes is this one: implement RemoteStore with the same four
 * methods and point `Store` at it.
 */

const NAMESPACE = 'shoot.v1';

/** localStorage-backed driver (current default). */
const LocalStore = {
  name: 'local',
  async read(key) {
    try {
      const raw = window.localStorage.getItem(`${NAMESPACE}.${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('[storage] read failed', key, err);
      return null;
    }
  },
  async write(key, value) {
    try {
      window.localStorage.setItem(`${NAMESPACE}.${key}`, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[storage] write failed', key, err);
      return false;
    }
  },
  async remove(key) {
    try {
      window.localStorage.removeItem(`${NAMESPACE}.${key}`);
      return true;
    } catch {
      return false;
    }
  },
  async keys() {
    const out = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(`${NAMESPACE}.`)) out.push(k.slice(NAMESPACE.length + 1));
    }
    return out;
  },
};

/**
 * In-memory fallback for private-browsing modes where localStorage throws.
 * The game stays fully playable, the run just does not survive a reload.
 */
const MemoryStore = {
  name: 'memory',
  _map: new Map(),
  async read(key) {
    return this._map.has(key) ? JSON.parse(this._map.get(key)) : null;
  },
  async write(key, value) {
    this._map.set(key, JSON.stringify(value));
    return true;
  },
  async remove(key) {
    this._map.delete(key);
    return true;
  },
  async keys() {
    return [...this._map.keys()];
  },
};

function pickDriver() {
  try {
    const probe = `${NAMESPACE}.__probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return LocalStore;
  } catch {
    console.warn('[storage] localStorage unavailable — falling back to memory store');
    return MemoryStore;
  }
}

export let Store = pickDriver();

/**
 * Swap the backing driver. A future RemoteStore only has to implement
 * read/write/remove/keys with the same signatures.
 */
export function setStore(driver) {
  Store = driver;
}

// --- Convenience wrappers used across the game ------------------------------

export const read = (key, fallback = null) => Store.read(key).then((v) => (v == null ? fallback : v));
export const write = (key, value) => Store.write(key, value);
export const remove = (key) => Store.remove(key);
export const keys = () => Store.keys();
