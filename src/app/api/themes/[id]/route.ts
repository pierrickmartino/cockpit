import { NextResponse } from 'next/server'
import { getThemeRepository } from '@/repositories/factory'
import { getTheme } from '@/services/theme-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const result = await getTheme(getThemeRepository(), id)
  return NextResponse.json(result.body, { status: result.status })
}
