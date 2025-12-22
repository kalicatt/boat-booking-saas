// Mock for next/server module to avoid import errors in tests

export class NextResponse {
  static json(data: any, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  }

  static redirect(url: string, status?: number) {
    return new Response(null, {
      status: status || 307,
      headers: { Location: url },
    })
  }
}

export class NextRequest extends Request {}

export const userAgent = () => ({})
export const useSearchParams = () => ({})
export const useRouter = () => ({})
export const usePathname = () => '/'
