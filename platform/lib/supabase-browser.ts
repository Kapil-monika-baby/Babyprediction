const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ogedhbmrrphxwqmiiuwl.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DbPanOolR5ZQzPKjtr6Sag_G6pitpgW';

const TOKEN_KEY = 'babyprediction_supabase_token';

function headers(token?: string) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    'Content-Type': 'application/json',
  };
}

function token() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) || '';
}

function saveSession(accessToken: string | undefined) {
  if (typeof window !== 'undefined' && accessToken) window.localStorage.setItem(TOKEN_KEY, accessToken);
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

class QueryBuilder {
  private path: string;
  private query = new URLSearchParams();
  private method = 'GET';
  private body: unknown;
  private wantSingle = false;

  constructor(table: string) {
    this.path = `/rest/v1/${table}`;
  }

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.query.set('select', columns);
    if (options?.head) this.method = 'HEAD';
    if (options?.count) this.query.set('Prefer', `count=${options.count}`);
    return this;
  }

  eq(column: string, value: string) {
    this.query.set(column, `eq.${value}`);
    return this;
  }

  in(column: string, values: string[]) {
    this.query.set(column, `in.(${values.join(',')})`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.query.set('order', `${column}.${options?.ascending === false ? 'desc' : 'asc'}`);
    return this;
  }

  limit(value: number) {
    this.query.set('limit', String(value));
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  insert(row: unknown | unknown[]) {
    this.method = 'POST';
    this.body = row;
    return this;
  }

  update(row: unknown) {
    this.method = 'PATCH';
    this.body = row;
    return this;
  }

  async then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    try {
      const response = await fetchWithTimeout(url + this.path + (this.query.toString() ? `?${this.query}` : ''), {
        method: this.method,
        headers: {
          ...headers(token()),
          Prefer: 'return=representation',
        },
        body: this.method === 'GET' || this.method === 'HEAD' ? undefined : JSON.stringify(this.body),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      const result = response.ok
        ? { data: this.wantSingle ? (Array.isArray(data) ? data[0] : data) : data, error: null, count: null }
        : { data: null, error: { message: data?.message || text || 'Supabase request failed' }, count: null };
      return resolve(result);
    } catch (error) {
      return reject ? reject(error) : resolve({ data: null, error: { message: error instanceof DOMException && error.name === 'AbortError' ? 'Supabase request timed out. Please try again.' : String(error) } });
    }
  }
}

export const supabase = {
  auth: {
    async getUser() {
      const accessToken = token();
      if (!accessToken) return { data: { user: null }, error: null };
      try {
        const response = await fetchWithTimeout(url + '/auth/v1/user', { headers: headers(accessToken) });
        if (!response.ok) {
          if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
          return { data: { user: null }, error: { message: 'Session expired. Please log in again.' } };
        }
        return { data: { user: await response.json() }, error: null };
      } catch (error) {
        return { data: { user: null }, error: { message: error instanceof DOMException && error.name === 'AbortError' ? 'Supabase request timed out. Please try again.' : String(error) } };
      }
    },

    async signInWithPassword(credentials: { email: string; password: string }) {
      try {
        const response = await fetchWithTimeout(url + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(credentials),
        });
        const data = await response.json();
        if (!response.ok) return { data: null, error: { message: data?.msg || data?.message || 'Login failed' } };
        saveSession(data.access_token);
        return { data, error: null };
      } catch (error) {
        return { data: null, error: { message: error instanceof DOMException && error.name === 'AbortError' ? 'Supabase request timed out. Please try again.' : String(error) } };
      }
    },

    async signUp(payload: { email: string; password: string; options?: { data?: Record<string, string> } }) {
      try {
        const response = await fetchWithTimeout(url + '/auth/v1/signup', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ email: payload.email, password: payload.password, data: payload.options?.data || {} }),
        });
        const data = await response.json();
        if (!response.ok) return { data: null, error: { message: data?.msg || data?.message || 'Signup failed' } };
        saveSession(data.access_token);
        return { data, error: null };
      } catch (error) {
        return { data: null, error: { message: error instanceof DOMException && error.name === 'AbortError' ? 'Supabase request timed out. Please try again.' : String(error) } };
      }
    },
  },

  from(table: string) {
    return new QueryBuilder(table);
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File, options?: { contentType?: string; cacheControl?: string }) {
          try {
            const response = await fetchWithTimeout(`${url}/storage/v1/object/${bucket}/${path}`, {
              method: 'POST',
              headers: {
                ...headers(token()),
                'Content-Type': options?.contentType || file.type || 'application/octet-stream',
                'x-upsert': 'true',
              },
              body: file,
            });
            const data = await response.json().catch(() => ({}));
            return response.ok ? { data, error: null } : { data: null, error: { message: data?.message || 'Upload failed' } };
          } catch (error) {
            return { data: null, error: { message: error instanceof DOMException && error.name === 'AbortError' ? 'Upload timed out. Please try again.' : String(error) } };
          }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `${url}/storage/v1/object/public/${bucket}/${path}` } };
        },
      };
    },
  },
};
