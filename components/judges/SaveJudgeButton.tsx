/**
 * Save Judge Button with iOS Push Notification Integration
 * 
 * Allows users to bookmark/follow a judge and optionally enable
 * push notifications for updates. Demonstrates iOS native integration.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BookmarkIcon, CheckIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SaveJudgeButtonProps {
  judgeId: string
  judgeName: string
  className?: string
}

export function SaveJudgeButton({ 
  judgeId, 
  judgeName,
  className 
}: SaveJudgeButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // iOS-native features removed in web-only repo

  const supabase = createClient()
  
  // Check if judge is already saved on mount
  useEffect(() => {
    checkIfSaved()
  }, [judgeId])
  
  async function checkIfSaved() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
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
  
  async function handleSave() {
    setIsLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
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
        }
      } else {
        // Save
        const { error } = await supabase
          .from('user_bookmarks')
          .insert({
            user_id: user.id,
            judge_id: judgeId,
            judge_name: judgeName,
            created_at: new Date().toISOString()
          })
        
        if (!error) {
          setIsSaved(true)
        }
      }
    } catch (error) {
      console.error('[SaveJudgeButton] Error saving judge:', error)
    } finally {
      setIsLoading(false)
    }
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
