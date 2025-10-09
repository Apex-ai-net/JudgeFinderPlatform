import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveAdminStatus } from '@/lib/auth/is-admin'
import { Shield, Lock, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MFARequiredPage(): Promise<JSX.Element> {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in?redirect_url=/admin')
  }

  const status = await resolveAdminStatus()

  if (!status.isAdmin) {
    redirect('/')
  }

  // If MFA is already enabled, redirect to admin dashboard
  if (status.hasMFA) {
    redirect('/admin')
  }

  // Get Clerk dashboard URL for MFA setup
  const clerkDashboardUrl =
    process.env.NEXT_PUBLIC_CLERK_DASHBOARD_URL || 'https://dashboard.clerk.com'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white shadow-lg border border-gray-200 rounded-xl p-8 md:p-12">
          {/* Header with Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-amber-100 p-4 rounded-full">
              <Shield className="w-12 h-12 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Multi-Factor Authentication Required
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 text-center mb-8">
            To access the admin dashboard in production, you must enable two-factor authentication
            (2FA) on your account. This is a security requirement to protect sensitive judicial
            data.
          </p>

          {/* Why MFA Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Why MFA is Required
            </h2>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Protects access to sensitive judicial records and analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Prevents unauthorized access even if password is compromised</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Meets security compliance requirements for handling PII</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Required by platform security policy for all administrators</span>
              </li>
            </ul>
          </div>

          {/* Setup Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Enable MFA</h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="bg-gray-200 text-gray-900 font-semibold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                  1
                </span>
                <span>Click your profile icon in the top navigation bar</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-gray-200 text-gray-900 font-semibold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                  2
                </span>
                <span>Select &quot;Manage account&quot; to open your Clerk account settings</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-gray-200 text-gray-900 font-semibold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                  3
                </span>
                <span>Navigate to the &quot;Security&quot; section</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-gray-200 text-gray-900 font-semibold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                  4
                </span>
                <span>
                  Enable &quot;Two-factor authentication&quot; using an authenticator app
                  (recommended) or SMS
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-gray-200 text-gray-900 font-semibold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                  5
                </span>
                <span>Follow the setup wizard to complete MFA enrollment</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-gray-200 text-gray-900 font-semibold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                  6
                </span>
                <span>Return to this page and refresh to access the admin dashboard</span>
              </li>
            </ol>
          </div>

          {/* Recommended Apps */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-green-900 mb-3">
              Recommended Authenticator Apps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-green-800">
              <div>
                <p className="font-medium">Google Authenticator</p>
                <p className="text-sm text-green-700">iOS and Android</p>
              </div>
              <div>
                <p className="font-medium">Microsoft Authenticator</p>
                <p className="text-sm text-green-700">iOS and Android</p>
              </div>
              <div>
                <p className="font-medium">Authy</p>
                <p className="text-sm text-green-700">iOS, Android, Desktop</p>
              </div>
              <div>
                <p className="font-medium">1Password</p>
                <p className="text-sm text-green-700">Cross-platform</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Check MFA Status
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Return to Home
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Having trouble setting up MFA? Contact the platform administrator or visit{' '}
              <a
                href="https://clerk.com/docs/authentication/configuration/sign-up-sign-in-options#multi-factor-authentication"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Clerk MFA documentation
              </a>
            </p>
          </div>
        </div>

        {/* Environment Notice */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 text-center">
              Development Mode: MFA enforcement is disabled in development environments
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export const metadata = {
  title: 'MFA Required - JudgeFinder Admin',
  description: 'Multi-factor authentication is required for admin access',
}
