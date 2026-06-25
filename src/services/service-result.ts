import type { ApiResponse } from '@/api/response'

/** An HTTP status paired with the response envelope a service wants returned. */
export interface ServiceResult<T> {
  status: number
  body: ApiResponse<T>
}
