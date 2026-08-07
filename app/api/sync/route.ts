import { NextResponse } from 'next/server'
import { syncEmailsAction } from '@/app/actions/EmailSync'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Optional security: Check token query parameter
  const { searchParams } = new URL(request.url)
  const queryToken = searchParams.get('token')
  const expectedToken = process.env.CRON_TOKEN

  // If CRON_TOKEN is configured in environment, enforce token validation
  if (expectedToken && queryToken !== expectedToken) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing token' },
      { status: 401 }
    )
  }

  try {
    const result = await syncEmailsAction()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in CRON sync API route:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync emails' },
      { status: 500 }
    )
  }
}
