export function getApiBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}
