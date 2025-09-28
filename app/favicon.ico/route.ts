import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  // Redirect requests for /favicon.ico to the existing SVG favicon
  // This avoids 500s when browsers request .ico specifically
  return NextResponse.redirect(new URL('/favicon.svg', 'https://judgefinder.io'), 308)
}


