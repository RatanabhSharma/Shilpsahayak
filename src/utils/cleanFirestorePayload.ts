/**
 * Recursively strips any keys with `undefined` values from an object or array.
 * Firestore throws errors when encountering `undefined` anywhere in document data.
 */
export function cleanFirestorePayload<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestorePayload(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    // Preserve instances like Date
    if (data instanceof Date) {
      return data;
    }

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned as T;
  }

  return data;
}
