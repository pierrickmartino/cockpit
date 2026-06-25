/** Standard response envelope used by every API endpoint (per project rules). */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}

export function fail(error: string): ApiResponse<never> {
  return { success: false, error }
}
