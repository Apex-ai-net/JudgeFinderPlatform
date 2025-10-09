/**
 * Save Judge Button with iOS Push Notification Integration
 *
 * Allows users to bookmark/follow a judge and optionally enable
 * push notifications for updates. Demonstrates iOS native integration.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BookmarkIcon, BellIcon, CheckIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SaveJudgeButtonProps {
  judgeId: string
  judgeName: string
  className?: string
}

export function SaveJudgeButton({ judgeId, judgeName, className }: SaveJudgeButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)

  // iOS features removed in web repo; use stubs
  const isNative = false as const
  const pushEnabled = false as const
  const enableNotifications = async () => false as const
  const widgetManager = { updateWidgetData: async () => {} } as const

  const supabase = createClient()

  // Check if judge is already saved on mount
  useEffect(() => {
    checkIfSaved()
  }, [judgeId])

  async function checkIfSaved(): JSX.Element {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('judge_id', judgeId)
        .maybeSingle()

      if (!error && data) {
        setIsSaved(true)
      }
    } catch (error) {
      console.error('[SaveJudgeButton] Error checking saved status:', error)
    }
  }

  async function handleSave(): JSX.Element {
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to login
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
        return
      }

      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('user_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('judge_id', judgeId)

        if (!error) {
          setIsSaved(false)

          // Update iOS widgets after unsaving
          if (isNative) {
            widgetManager.updateWidgetData().catch(console.error)
          }
        }
      } else {
        // Save
        const { error } = await supabase.from('user_bookmarks').insert({
          user_id: user.id,
          judge_id: judgeId,
          judge_name: judgeName,
          created_at: new Date().toISOString(),
        })

        if (!error) {
          setIsSaved(true)

          // Update iOS widgets with new saved judge
          if (isNative) {
            widgetManager.updateWidgetData().catch(console.error)
          }

          // Show notification prompt if in native iOS and not enabled
          if (isNative && !pushEnabled) {
            setShowNotificationPrompt(true)
          }
        }
      }
    } catch (error) {
      console.error('[SaveJudgeButton] Error saving judge:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEnableNotifications(): JSX.Element {
    setIsLoading(true)

    try {
      const success = await enableNotifications()

      if (success) {
        console.log('[SaveJudgeButton] Notifications enabled successfully')
        setShowNotificationPrompt(false)
      } else {
        console.log('[SaveJudgeButton] Notifications were denied')
      }
    } catch (error) {
      console.error('[SaveJudgeButton] Error enabling notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleMaybeLater(): JSX.Element {
    setShowNotificationPrompt(false)
  }

  if (showNotificationPrompt) {
    return (
      <div className="rounded-lg border border-blue-200 bg-primary/5 p-4 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex items-start gap-3">
          <BellIcon className="h-5 w-5 text-primary dark:text-primary mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              Get Notified About {judgeName}
            </h4>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
              Receive instant alerts when this judge has new decisions, court assignment changes, or
              profile updates.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                size="sm"
                className="bg-primary hover:bg-blue-700"
              >
                <BellIcon className="h-4 w-4 mr-2" />
                Enable Alerts
              </Button>
              <Button onClick={handleMaybeLater} disabled={isLoading} variant="ghost" size="sm">
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={handleSave}
      disabled={isLoading}
      variant={isSaved ? 'default' : 'outline'}
      className={className}
    >
      {isSaved ? (
        <>
          <CheckIcon className="h-4 w-4 mr-2" />
          Saved
          {isNative && pushEnabled && <BellIcon className="h-4 w-4 ml-2 text-green-500" />}
        </>
      ) : (
        <>
          <BookmarkIcon className="h-4 w-4 mr-2" />
          Save Judge
        </>
      )}
    </Button>
  )
}
