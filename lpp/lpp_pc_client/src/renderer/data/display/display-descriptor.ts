export interface DisplayDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

export function displayKey(
  key: string,
  params?: Record<string, string | number>,
): DisplayDescriptor {
  return params ? { key, params } : { key };
}
