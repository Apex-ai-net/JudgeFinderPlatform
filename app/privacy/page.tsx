import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Privacy Policy - JudgeFinder.io',
  description: 'Privacy policy and data protection information for JudgeFinder.io',
}

export default function PrivacyPage(): JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <p className="text-muted-foreground mb-6">Last updated: January 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p>JudgeFinder.io collects the following categories of information:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Account Information</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Email address (when you create an account)</li>
              <li>Account authentication data (managed securely by Clerk)</li>
              <li>Profile preferences and settings</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              Professional Verification Data (Attorneys Only)
            </h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Bar number(s) and jurisdiction(s) of licensure</li>
              <li>Law firm or practice name</li>
              <li>Practice area specializations</li>
              <li>Professional contact information (for advertising services)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Search queries and browsing history on our platform</li>
              <li>Judge profiles viewed and bookmarked</li>
              <li>Feature usage and interaction patterns</li>
              <li>Device information, IP address, and browser type</li>
              <li>Referral sources and navigation paths</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Communications</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Support inquiries and correspondence</li>
              <li>Feedback and survey responses</li>
              <li>Email communication preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p>We use collected information for the following purposes:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Service Delivery</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Provide access to judicial data, analytics, and search functionality</li>
              <li>Personalize search results and recommendations</li>
              <li>Maintain bookmarks and user preferences</li>
              <li>Process advertising placements for verified attorneys</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Platform Improvement</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Develop new features and improve existing functionality</li>
              <li>Conduct research to improve judicial analytics algorithms</li>
              <li>Test and optimize platform performance</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Security and Compliance</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Verify attorney credentials through bar number validation</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
              <li>Enforce our Terms of Service and Acceptable Use Policy</li>
              <li>Comply with legal obligations and respond to lawful requests</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Communications</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Send important service updates and security notifications</li>
              <li>Respond to support inquiries and feedback</li>
              <li>
                Deliver marketing communications (with your explicit consent, opt-out available)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Bar Number Data Handling</h2>
            <p className="font-semibold">
              For attorneys who advertise on JudgeFinder.io or seek professional verification, we
              collect and verify bar numbers to ensure platform integrity and compliance with
              attorney advertising regulations.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Bar Number Security</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Encryption at Rest:</strong> Bar numbers are stored in encrypted database
                fields using AES-256 encryption
              </li>
              <li>
                <strong>Transmission Security:</strong> All bar number verification requests use TLS
                1.3 encrypted connections
              </li>
              <li>
                <strong>Access Control:</strong> Only authorized system processes and verified
                administrators can access bar number data
              </li>
              <li>
                <strong>Verification Process:</strong> Bar numbers are verified against official
                state bar databases at registration
              </li>
              <li>
                <strong>Limited Retention:</strong> Bar numbers for non-advertisers are deleted
                after verification; advertisers' bar numbers are retained for compliance purposes
                only
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">How We Use Bar Numbers</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Verify active attorney licensure status</li>
              <li>Confirm jurisdiction(s) of practice</li>
              <li>Display "Verified Attorney" badges on profiles</li>
              <li>Maintain advertising platform integrity</li>
              <li>Respond to ethical complaints or regulatory inquiries</li>
            </ul>

            <p className="mt-4">
              We never sell, share, or publicly display bar numbers. We do not use bar numbers for
              marketing purposes beyond platform verification badges.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Protection and Security</h2>
            <p>We implement comprehensive security measures to protect your information:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Technical Safeguards</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>TLS 1.3 encrypted data transmission (HTTPS) for all connections</li>
              <li>Secure database storage with Supabase using row-level security policies</li>
              <li>AES-256 encryption for sensitive data at rest</li>
              <li>Multi-factor authentication support via Clerk</li>
              <li>Regular security audits and penetration testing</li>
              <li>Automated vulnerability scanning and patch management</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Organizational Safeguards</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Limited access to user data by authorized personnel only</li>
              <li>Background checks for employees with data access</li>
              <li>Confidentiality agreements for all personnel</li>
              <li>Regular security training and awareness programs</li>
              <li>Incident response plan with breach notification procedures</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Data Breach Protocol</h3>
            <p className="mt-2">
              In the event of a data breach affecting personal information, we will:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Notify affected users within 72 hours of discovery</li>
              <li>Provide details about the nature and scope of the breach</li>
              <li>Describe steps taken to mitigate harm</li>
              <li>Notify applicable regulatory authorities as required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p>
              We retain personal information for different periods depending on the data category
              and purpose:
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Retention Periods</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Account Data:</strong> Retained for the lifetime of your account plus 30
                days after deletion (to prevent accidental data loss and facilitate account
                recovery)
              </li>
              <li>
                <strong>Bar Number Verification:</strong> For non-advertisers, deleted immediately
                after verification; for active advertisers, retained for duration of advertising
                relationship plus 7 years (for regulatory compliance)
              </li>
              <li>
                <strong>Usage Analytics:</strong> Aggregated analytics retained indefinitely;
                individual-level data retained for 24 months then anonymized
              </li>
              <li>
                <strong>Search History:</strong> Retained for 12 months for personalization, then
                automatically deleted
              </li>
              <li>
                <strong>Support Communications:</strong> Retained for 3 years for customer service
                quality and legal compliance
              </li>
              <li>
                <strong>Advertising Records:</strong> Retained for 7 years to comply with tax and
                advertising regulations
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Data Deletion</h3>
            <p className="mt-2">Upon account deletion, we will:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Immediately disable account access</li>
              <li>
                Delete personal information within 30 days (except where legal retention is
                required)
              </li>
              <li>Anonymize usage data that must be retained for analytics purposes</li>
              <li>Remove all bookmarks and preferences</li>
              <li>Cancel active advertising campaigns and process final billing</li>
            </ul>

            <p className="mt-4 font-semibold">
              Note: Public court data about judges is not considered personal information and is not
              deleted upon account closure, as it is sourced from public records and not
              user-generated content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. California Consumer Privacy Act (CCPA) Compliance
            </h2>
            <p className="font-semibold">
              California residents have specific privacy rights under the California Consumer
              Privacy Act (CCPA) and the California Privacy Rights Act (CPRA).
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Your California Privacy Rights</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Right to Know:</strong> You can request disclosure of the categories and
                specific pieces of personal information we have collected about you
              </li>
              <li>
                <strong>Right to Delete:</strong> You can request deletion of your personal
                information, subject to certain exceptions
              </li>
              <li>
                <strong>Right to Opt-Out:</strong> You can opt out of the sale of your personal
                information (Note: We do not sell personal information)
              </li>
              <li>
                <strong>Right to Non-Discrimination:</strong> You will not receive discriminatory
                treatment for exercising your privacy rights
              </li>
              <li>
                <strong>Right to Correct:</strong> You can request correction of inaccurate personal
                information
              </li>
              <li>
                <strong>Right to Limit Use of Sensitive Personal Information:</strong> You can limit
                our use of sensitive personal information (such as bar numbers) to necessary
                business purposes only
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">How to Exercise Your Rights</h3>
            <p className="mt-2">To exercise any of these rights, contact us at:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Email: privacy@judgefinder.io</li>
              <li>Subject line: "CCPA Request - [Your Request Type]"</li>
              <li>Include your account email and describe your request</li>
            </ul>

            <p className="mt-4">
              We will verify your identity before processing requests and respond within 45 days
              (extendable to 90 days for complex requests with notification).
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              Categories of Personal Information Collected
            </h3>
            <p className="mt-2">
              As required by CCPA, we disclose the following categories of personal information
              collected in the past 12 months:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Identifiers (email, IP address, device identifiers)</li>
              <li>
                Professional information (bar numbers, law firm affiliations for verified attorneys)
              </li>
              <li>Internet activity (search queries, page views, interactions)</li>
              <li>Commercial information (advertising purchases, transaction history)</li>
              <li>
                Inferences (preferences, characteristics, behaviors derived from usage patterns)
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Data Sharing Disclosure</h3>
            <p className="mt-2">
              We share personal information with the following categories of third parties for
              business purposes:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Authentication service providers (Clerk) - identity verification</li>
              <li>Database hosting providers (Supabase) - data storage</li>
              <li>Analytics providers - usage analysis (anonymized where possible)</li>
              <li>Payment processors - for advertising transactions</li>
            </ul>

            <p className="mt-4 font-semibold">
              We do not sell personal information and have not sold personal information in the past
              12 months.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Public Court Data</h2>
            <p>
              JudgeFinder.io displays publicly available court data from official sources. This
              includes:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Judge profiles and court assignments</li>
              <li>Public case decisions and rulings</li>
              <li>Court statistics and performance metrics</li>
            </ul>
            <p className="mt-2">This public data is not considered personal information.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Cookies and Tracking</h2>
            <p>We use essential cookies and analytics to:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Maintain your login session</li>
              <li>Remember your preferences</li>
              <li>Analyze platform usage patterns</li>
            </ul>
            <p className="mt-4">
              For detailed information about our cookie usage and how to manage your preferences,
              please see our{' '}
              <a href="/cookies" className="text-blue-600 hover:underline">
                Cookie Policy
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Third-Party Services</h2>
            <p>We integrate with trusted third-party services:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Clerk for authentication</li>
              <li>Supabase for database services</li>
              <li>CourtListener for court data</li>
            </ul>
            <p className="mt-2">Each service has its own privacy policy.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p>For privacy concerns or data requests, contact us at:</p>
            <p className="mt-2">
              Email: privacy@judgefinder.io
              <br />
              Address: JudgeFinder.io, California, USA
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
            <p>
              We may update this privacy policy periodically. We will notify you of significant
              changes via email or platform notification. The "Last updated" date at the top of this
              policy indicates when the most recent changes were made.
            </p>
            <p className="mt-4">
              Your continued use of JudgeFinder.io after policy updates constitutes acceptance of
              the revised policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Additional Resources</h2>
            <p>For more information about your rights and our practices, please review:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                - Usage terms and legal agreements
              </li>
              <li>
                <a href="/cookies" className="text-blue-600 hover:underline">
                  Cookie Policy
                </a>{' '}
                - Detailed cookie information
              </li>
              <li>
                <a href="/acceptable-use" className="text-blue-600 hover:underline">
                  Acceptable Use Policy
                </a>{' '}
                - Platform usage guidelines
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
