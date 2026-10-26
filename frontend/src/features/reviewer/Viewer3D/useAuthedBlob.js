import { useEffect, useState } from "react";

// Downloads a protected file (needs the Authorization header, so <img src> and
// useGLTF(url) cannot load it directly) and exposes it as a blob: URL.
export default function useAuthedBlob(url, mime) {
  const [state, setState] = useState({ objectUrl: null, loading: Boolean(url), error: null, progress: 0 });

  useEffect(() => {
    if (!url) {
      setState({ objectUrl: null, loading: false, error: null, progress: 0 });
      return undefined;
    }
    const controller = new AbortController();
    let created = null;
    setState({ objectUrl: null, loading: true, error: null, progress: 0 });

    (async () => {
      try {
        const token = localStorage.getItem("jwt_token");
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);

        const total = Number(res.headers.get("content-length")) || 0;
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total) setState((s) => ({ ...s, progress: received / total }));
        }
        created = URL.createObjectURL(new Blob(chunks, mime ? { type: mime } : undefined));
        setState({ objectUrl: created, loading: false, error: null, progress: 1 });
      } catch (e) {
        if (e.name !== "AbortError") setState({ objectUrl: null, loading: false, error: e.message, progress: 0 });
      }
    })();

    return () => {
      controller.abort();
      if (created) URL.revokeObjectURL(created);
    };
  }, [url, mime]);

  return state;
}