'use client'

import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, X, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'

interface AdCreativeManagerProps {
  advertiserProfile: {
    id: string
    firm_name: string
    logo_url: string | null
    description: string | null
  }
  onUpdate?: () => void
}

export function AdCreativeManager({ advertiserProfile, onUpdate }: AdCreativeManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(advertiserProfile.logo_url)
  const [tagline, setTagline] = useState(advertiserProfile.description || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, or SVG)')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB')
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('advertiser_id', advertiserProfile.id)

      // Upload to API
      const response = await fetch('/api/advertising/upload-logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload logo')
      }

      const data = await response.json()
      setPreviewUrl(data.logo_url)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      if (onUpdate) onUpdate()
    } catch (err) {
      logger.error('Failed to upload logo', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove your firm logo?')) return

    try {
      setUploading(true)
      setError(null)

      const response = await fetch('/api/advertising/upload-logo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertiser_id: advertiserProfile.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove logo')
      }

      setPreviewUrl(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      if (onUpdate) onUpdate()
    } catch (err) {
      logger.error('Failed to remove logo', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to remove logo')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateTagline = async () => {
    try {
      setUploading(true)
      setError(null)

      const response = await fetch('/api/advertising/update-creative', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: advertiserProfile.id,
          description: tagline,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update tagline')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      if (onUpdate) onUpdate()
    } catch (err) {
      logger.error('Failed to update tagline', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to update tagline')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Firm Logo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Area */}
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your firm logo to appear on your advertisements. Recommended size: 400x200px
              or larger.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {previewUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>

              {previewUrl && (
                <Button
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove Logo
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <p className="text-xs text-muted-foreground/70 mt-3">
              Supported formats: PNG, JPG, SVG • Max size: 2MB
            </p>
          </div>

          {/* Preview */}
          <div>
            <p className="text-sm font-medium text-foreground/80 mb-3">
              Preview
            </p>
            <div className="aspect-[2/1] rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`${advertiserProfile.firm_name} logo`}
                  className="max-w-full max-h-full object-contain p-4"
                />
              ) : (
                <div className="text-center text-muted-foreground/50">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No logo uploaded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tagline Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Firm Tagline
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          Write a compelling tagline that will appear alongside your logo in advertisements. Keep
          it concise and professional.
        </p>

        <div className="space-y-4">
          <div>
            <textarea
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={150}
              rows={3}
              className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
              placeholder="e.g., Experienced civil litigation attorneys serving Orange County for over 20 years"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground/70">
                {tagline.length} / 150 characters
              </p>
              {tagline !== advertiserProfile.description && (
                <Button
                  onClick={handleUpdateTagline}
                  disabled={uploading || !tagline.trim()}
                  size="sm"
                >
                  Save Tagline
                </Button>
              )}
            </div>
          </div>

          {/* Ad Preview */}
          <div className="border border-border rounded-lg p-4 bg-muted">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Advertisement Preview
            </p>
            <div className="bg-card rounded border border-border p-4">
              <div className="flex items-start gap-4">
                {previewUrl ? (
                  <div className="w-24 h-12 flex-shrink-0">
                    <img
                      src={previewUrl}
                      alt={`${advertiserProfile.firm_name} logo`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground mb-1">
                    {advertiserProfile.firm_name}
                  </p>
                  {tagline ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {tagline}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">
                      Your tagline will appear here
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground/70">
                  📍 Verified Attorney • CA Bar #{advertiserProfile.id.slice(0, 6)}...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-start gap-3">
          <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-success">
              Changes saved successfully
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
