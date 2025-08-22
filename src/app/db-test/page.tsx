"use client";

import { useEffect, useState } from "react";

export default function DbTestPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/api/db-test")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Request failed");
        setData(j);
      })
      .catch((e) => setError(e.message || String(e)));
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">DB Test</h1>
      {error ? (
        <pre className="rounded-md bg-red-950/30 p-4 text-red-400">{error}</pre>
      ) : (
        <pre className="rounded-md bg-muted p-4">{JSON.stringify(data, null, 2)}</pre>
      )}
    </main>
  );
}
