import { NextResponse } from 'next/server'
import { getThemeRepository } from '@/repositories/factory'
import { createTheme } from '@/services/theme-service'

export async function POST(request: Request): Promise<NextResponse> {
  const input = await request.json().catch(() => null)
  const result = await createTheme(getThemeRepository(), input)
  return NextResponse.json(result.body, { status: result.status })
}
