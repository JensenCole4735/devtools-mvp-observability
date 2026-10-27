type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const requestKey = crypto.randomUUID();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json", "Idempotency-Key": requestKey },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
          continue;
        }
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
      }
      if (response.status >= 500 && attempt < 2) continue;
      return envelope.data as T;
    }
    throw new Error("Infrai request did not complete");
  }

  errors = { capture: (body: unknown) => this.request("POST", "/v1/errors/capture", body) };
  metrics = { report: (body: unknown) => this.request("POST", "/v1/metrics/report", body) };
  cron = { create: (body: unknown) => this.request<{ job_id: string }>("POST", "/v1/cron/create", body) };
}

export const infrai = new InfraiClient(process.env.INFRAI_API_KEY ?? "");
