// Finding and removing references to an uploaded image inside stored content (section data,
// SEO settings, site settings). Image fields store { src, alt }; some settings store a bare URL.

/** True when the image URL appears anywhere in the value. */
export function usesImage(value: unknown, url: string): boolean {
  if (!url) return false;
  if (typeof value === "string") return value === url;
  if (Array.isArray(value)) return value.some((item) => usesImage(item, url));
  if (value && typeof value === "object") {
    return Object.values(value).some((inner) => usesImage(inner, url));
  }
  return false;
}

/**
 * Returns a copy without the image: image values become empty ({ src: "", alt: "" }) and bare
 * URLs become "". Unchanged values keep their identity, so callers can tell whether anything changed.
 */
export function withoutImage<T>(value: T, url: string): T {
  if (typeof value === "string") return (value === url ? "" : value) as T;
  if (Array.isArray(value)) {
    const next = value.map((item) => withoutImage(item, url));
    return (next.some((item, index) => item !== value[index]) ? next : value) as T;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.src === url && typeof record.alt === "string") {
      return { ...record, src: "", alt: "" } as T;
    }
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(record)) {
      next[key] = withoutImage(inner, url);
      if (next[key] !== inner) changed = true;
    }
    return (changed ? next : value) as T;
  }
  return value;
}
