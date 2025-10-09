'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { toast as toastAnimation } from '@/lib/animations/presets'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: Toast = { ...toast, id }

      setToasts((prev) => [...prev, newToast])

      // Auto-remove after duration (default 5s)
      const duration = toast.duration || 5000
      setTimeout(() => removeToast(id), duration)

      return id
    },
    [removeToast]
  )

  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message })
    },
    [addToast]
  )

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'error', title, message })
    },
    [addToast]
  )

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message })
    },
    [addToast]
  )

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message })
    },
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast(): JSX.Element {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[]
  removeToast: (id: string) => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  }

  const colors = {
    success:
      'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100',
    error:
      'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100',
    info: 'bg-primary/5 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100',
    warning:
      'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-100',
  }

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-primary dark:text-primary',
    warning: 'text-yellow-600 dark:text-yellow-400',
  }

  const Icon = icons[toast.type]

  return (
    <motion.div
      variants={toastAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`
        pointer-events-auto
        flex items-start gap-3 rounded-lg border p-4 shadow-lg
        min-w-[320px] max-w-md
        ${colors[toast.type]}
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${iconColors[toast.type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.message && <p className="mt-1 text-xs opacity-80">{toast.message}</p>}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}
