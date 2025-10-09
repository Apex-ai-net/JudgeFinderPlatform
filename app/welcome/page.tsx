import { auth, currentUser } from '@clerk/nextjs/server'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { isAdmin } from '@/lib/auth/is-admin'

export default async function WelcomePage(): Promise<JSX.Element> {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect('/sign-in')
  }

  // Ensure Clerk↔Supabase mapping exists
  await ensureCurrentAppUser()

  // Check if user is admin
  const userIsAdmin = await isAdmin()

  // Admins skip onboarding and go straight to admin dashboard
  if (userIsAdmin) {
    redirect('/admin')
  }

  // Check if regular user has already completed onboarding
  if (user?.publicMetadata?.onboardingCompleted) {
    redirect('/dashboard')
  }

  const profession = user?.publicMetadata?.profession as string | undefined

  // Dynamic content based on profession
  const professionContent = {
    attorney: {
      greeting: 'Welcome to your competitive advantage',
      tagline: 'Research judges, prepare better, win more cases',
      features: [
        'Access comprehensive judicial analytics',
        'Compare judges across jurisdictions',
        'Track decision patterns and bias indicators',
        'Export reports for case preparation',
      ],
      videoId: 'dQw4w9WgXcQ', // Replace with actual YouTube ID
    },
    paralegal: {
      greeting: 'Your judicial research assistant',
      tagline: 'Fast, accurate judge research for your legal team',
      features: [
        'Quick judge lookups and profiles',
        'Bookmark judges for easy access',
        'Generate research reports',
        'Track case assignments',
      ],
      videoId: 'dQw4w9WgXcQ',
    },
    litigant: {
      greeting: 'Understanding your judge matters',
      tagline: 'Know who will hear your case',
      features: [
        'Learn about your assigned judge',
        'Understand judicial decision patterns',
        'Access court information',
        'Prepare with confidence',
      ],
      videoId: 'dQw4w9WgXcQ',
    },
    default: {
      greeting: 'Welcome to JudgeFinder',
      tagline: "California's premier judicial research platform",
      features: [
        'Search thousands of judge profiles',
        'Access AI-powered analytics',
        'Compare judicial patterns',
        'Track case outcomes',
      ],
      videoId: 'dQw4w9WgXcQ',
    },
  }

  const content =
    professionContent[profession as keyof typeof professionContent] || professionContent.default

  // Quick start checklist based on profession
  const quickStartItems =
    profession === 'attorney'
      ? [
          { text: 'Search for a judge in your jurisdiction', completed: false },
          { text: 'Review bias analytics and decision patterns', completed: false },
          { text: 'Bookmark judges for your active cases', completed: false },
          { text: 'Compare judges in your practice area', completed: false },
        ]
      : [
          { text: 'Complete your profile setup', completed: false },
          { text: 'Try your first judge search', completed: false },
          { text: 'Explore judicial analytics', completed: false },
          { text: 'Bookmark interesting judges', completed: false },
        ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Enhanced Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {content.greeting}, {user?.firstName || 'there'}!
            </h1>
            <p className="text-xl text-gray-300 mb-2">{content.tagline}</p>
            <p className="text-lg text-gray-400">
              Let's get you set up to make the most of our platform
            </p>
          </div>

          {/* Feature Highlights for User Type */}
          <div className="mb-8 bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">What you can do:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start Checklist */}
          <div className="mb-8 bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Start Guide</h3>
            <div className="space-y-3">
              {quickStartItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-card/20 rounded-lg">
                  <div className="h-6 w-6 rounded-full border-2 border-gray-500 flex items-center justify-center">
                    <span className="text-xs text-gray-400">{index + 1}</span>
                  </div>
                  <span className="text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tutorial Video Embed */}
          <div className="mb-8 bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Watch: Getting Started (2 min)
            </h3>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${content.videoId}`}
                title="JudgeFinder Tutorial"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <p className="text-sm text-gray-400 mt-3">
              Learn the basics of searching for judges, reading analytics, and maximizing your
              research efficiency.
            </p>
          </div>

          {/* Onboarding Wizard */}
          <OnboardingWizard user={user} />
        </div>
      </div>
    </div>
  )
}
