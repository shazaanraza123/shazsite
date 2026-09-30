import { useEffect, useState } from "react";
import { loadJson, loadSearchIndex, type SearchHit } from "@/lib/archive";

export function useSearchIndex() {
  const [index, setIndex] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadSearchIndex()
      .then((rows) => {
        if (alive) setIndex(rows);
      })
      .catch(() => {
        if (alive) setError("Search index could not be loaded.");
      });
    return () => {
      alive = false;
    };
  }, []);

  return { index, error };
}

export function useJson<T>(url: string) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let alive = true;
    loadJson<T>(url)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  return data;
}
