'use client'

import Link from 'next/link'
import { Search, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Display */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary/20 mb-2">404</h1>
          <div className="h-1 w-24 bg-primary mx-auto mb-8 rounded-full" />
        </div>

        {/* Message */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/">
            <Button variant="default" size="lg" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
          <Link href="/judges">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Search Judges
            </Button>
          </Link>
        </div>

        {/* Popular Links */}
        <div className="border-t border-border pt-8">
          <p className="text-sm text-muted-foreground mb-4 font-semibold">Popular Pages</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/compare" className="text-sm text-primary hover:underline">
              Compare Judges
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/jurisdictions" className="text-sm text-primary hover:underline">
              Browse by County
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/courts" className="text-sm text-primary hover:underline">
              View Courts
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/help" className="text-sm text-primary hover:underline">
              Get Help
            </Link>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back to previous page
          </button>
        </div>
      </div>
    </div>
  )
}