export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function http<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.message ?? "Request failed. Please retry.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
