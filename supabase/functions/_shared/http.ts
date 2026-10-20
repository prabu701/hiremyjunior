export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Wrap a handler: HttpErrors become their status + message; anything else is a logged 500. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ message: e.message }, e.status);
      console.error(e);
      return json({ message: 'Something went wrong. Please try again.' }, 500);
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Invalid request body');
  }
}
