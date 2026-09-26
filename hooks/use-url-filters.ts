"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Filters live in the URL (shareable, survive refresh — brain/03 §7).
 * Changing any filter other than `page` resets pagination.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = useMemo(() => {
    const result = {} as Record<K, string | undefined>;
    for (const key of keys) result[key] = searchParams.get(key) ?? undefined;
    return result;
  }, [keys, searchParams]);

  const setFilters = useCallback(
    (patch: Partial<Record<K, string | undefined>>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch) as Array<[string, string | undefined]>) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (!("page" in patch)) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of keys) next.delete(key);
    next.delete("page");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [keys, pathname, router, searchParams]);

  const activeCount = useMemo(
    () => keys.filter((key) => !["page", "pageSize", "sort", "order", "scope", "view"].includes(key) && values[key]).length,
    [keys, values],
  );

  return { values, setFilters, clearFilters, activeCount };
}
