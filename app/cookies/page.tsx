import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Cookie Policy - JudgeFinder.io',
  description: 'Cookie usage and tracking technology policy for JudgeFinder.io'
}

export default function CookiePolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Cookie Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">Effective Date: January 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              This Cookie Policy explains how JudgeFinder.io uses cookies and similar tracking technologies to recognize you when
              you visit our platform. It explains what these technologies are, why we use them, and your rights to control our
              use of them.
            </p>
            <p className="mt-4">
              By using JudgeFinder.io, you consent to our use of cookies in accordance with this Cookie Policy. If you do not
              agree to our use of cookies, you should adjust your browser settings accordingly or refrain from using our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your device (computer, smartphone, tablet) when you visit a website.
              They are widely used to make websites work more efficiently and provide information to website owners.
            </p>
            <p className="mt-4">
              Cookies can be "persistent" (remaining on your device until deleted or expired) or "session" cookies (automatically
              deleted when you close your browser).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>

            <h3 className="text-xl font-semibold mt-4 mb-2">Essential Cookies (Required)</h3>
            <p>
              These cookies are necessary for the platform to function properly and cannot be disabled in our systems.
            </p>
            <div className="bg-gray-50 p-4 rounded-md mt-2">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Cookie Name</th>
                    <th className="text-left py-2 pr-4">Purpose</th>
                    <th className="text-left py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">__clerk_*</td>
                    <td className="py-2 pr-4">User authentication and session management</td>
                    <td className="py-2">Session / 7 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">__session</td>
                    <td className="py-2 pr-4">Maintains your login state and preferences</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">CSRF-TOKEN</td>
                    <td className="py-2 pr-4">Security token to prevent cross-site request forgery</td>
                    <td className="py-2">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-2">Analytics Cookies (Optional)</h3>
            <p>
              These cookies help us understand how visitors interact with our platform by collecting and reporting information
              anonymously. This helps us improve user experience.
            </p>
            <div className="bg-gray-50 p-4 rounded-md mt-2">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Cookie Name</th>
                    <th className="text-left py-2 pr-4">Purpose</th>
                    <th className="text-left py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">_ga</td>
                    <td className="py-2 pr-4">Google Analytics - distinguish unique users</td>
                    <td className="py-2">2 years</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">_ga_*</td>
                    <td className="py-2 pr-4">Google Analytics - persist session state</td>
                    <td className="py-2">2 years</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">usage_stats</td>
                    <td className="py-2 pr-4">Track feature usage and page views</td>
                    <td className="py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-2">Advertising Cookies (Optional)</h3>
            <p>
              These cookies are used to track advertising impressions and measure the effectiveness of attorney advertisements
              on our platform.
            </p>
            <div className="bg-gray-50 p-4 rounded-md mt-2">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Cookie Name</th>
                    <th className="text-left py-2 pr-4">Purpose</th>
                    <th className="text-left py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">ad_impressions</td>
                    <td className="py-2 pr-4">Track advertisement views for billing purposes</td>
                    <td className="py-2">30 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">ad_clicks</td>
                    <td className="py-2 pr-4">Record advertisement interactions</td>
                    <td className="py-2">30 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">advertiser_session</td>
                    <td className="py-2 pr-4">Manage advertiser dashboard sessions</td>
                    <td className="py-2">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-2">Preference Cookies (Optional)</h3>
            <p>
              These cookies remember your choices and preferences to provide a more personalized experience.
            </p>
            <div className="bg-gray-50 p-4 rounded-md mt-2">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Cookie Name</th>
                    <th className="text-left py-2 pr-4">Purpose</th>
                    <th className="text-left py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">theme_preference</td>
                    <td className="py-2 pr-4">Remember your theme selection (light/dark mode)</td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">search_filters</td>
                    <td className="py-2 pr-4">Save your search preferences and filters</td>
                    <td className="py-2">90 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-sm">cookie_consent</td>
                    <td className="py-2 pr-4">Record your cookie preferences</td>
                    <td className="py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
            <p>
              Some cookies are placed by third-party services that appear on our pages. We do not control these cookies and
              you should check the third-party websites for more information.
            </p>
            <ul className="list-disc pl-6 mt-4">
              <li>
                <strong>Clerk (Authentication):</strong> Manages user authentication and session security
              </li>
              <li>
                <strong>Google Analytics:</strong> Provides anonymous usage statistics and traffic analysis
              </li>
              <li>
                <strong>Supabase:</strong> Database connection and API authentication
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. How to Manage Cookies</h2>
            <p>
              You have several options to manage or disable cookies:
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Browser Settings</h3>
            <p>
              Most web browsers allow you to control cookies through their settings. You can set your browser to:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Block all cookies</li>
              <li>Block third-party cookies only</li>
              <li>Clear cookies when you close your browser</li>
              <li>Make exceptions for specific websites</li>
            </ul>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
              <p className="font-semibold">Browser-Specific Instructions:</p>
              <ul className="list-disc pl-6 mt-2">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Microsoft Edge</a></li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-2">Platform Cookie Settings</h3>
            <p>
              You can manage your cookie preferences directly on JudgeFinder.io through your account settings:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Navigate to Settings → Privacy → Cookie Preferences</li>
              <li>Toggle analytics and advertising cookies on/off</li>
              <li>Your choices will be remembered for future visits</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-2">Impact of Disabling Cookies</h3>
            <p className="font-semibold text-amber-700 mt-2">
              Please note that disabling cookies may limit your use of certain features:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>You will not be able to log in or maintain an authenticated session</li>
              <li>Your preferences and settings will not be saved</li>
              <li>Some features may not function properly</li>
              <li>We cannot personalize your experience</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Do Not Track Signals</h2>
            <p>
              Some browsers have a "Do Not Track" feature that signals to websites that you do not want to have your online
              activities tracked. JudgeFinder.io currently does not respond to Do Not Track signals because there is no
              industry-standard for compliance.
            </p>
            <p className="mt-4">
              However, you can still manage cookies and tracking through your browser settings and our cookie preference center
              as described above.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. California and EU Residents</h2>
            <h3 className="text-xl font-semibold mt-4 mb-2">California Residents</h3>
            <p>
              California residents have the right to opt-out of the sale of personal information collected through cookies.
              JudgeFinder.io does not sell personal information. For more details about your California privacy rights, see
              our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">European Union Residents</h3>
            <p>
              If you are located in the European Economic Area (EEA), you have the right to object to our use of cookies and
              request that we delete information collected through cookies. Contact privacy@judgefinder.io to exercise these rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Updates to This Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, operational,
              or regulatory reasons. We will notify you of significant changes by posting a notice on our platform or sending
              an email to registered users.
            </p>
            <p className="mt-4">
              The "Effective Date" at the top of this policy indicates when it was last revised. We encourage you to review
              this Cookie Policy periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
            <p>
              If you have questions about our use of cookies or this Cookie Policy, please contact us:
            </p>
            <p className="mt-2">
              Email: privacy@judgefinder.io<br />
              Subject: Cookie Policy Inquiry<br />
              Address: JudgeFinder.io, California, USA
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Additional Resources</h2>
            <p>
              For more information about how we handle your data, please review:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li><a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> - Comprehensive data protection information</li>
              <li><a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> - Usage terms and agreements</li>
              <li><a href="/acceptable-use" className="text-blue-600 hover:underline">Acceptable Use Policy</a> - Platform usage guidelines</li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
