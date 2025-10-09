import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Acceptable Use Policy - JudgeFinder.io',
  description: 'Acceptable use policy and community guidelines for JudgeFinder.io',
}

export default function AcceptableUsePage(): JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Acceptable Use Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">Effective Date: January 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Purpose and Scope</h2>
            <p>
              This Acceptable Use Policy ("AUP") governs your use of JudgeFinder.io and sets forth
              the standards of conduct expected from all users. This policy supplements our Terms of
              Service and applies to all users, including casual visitors, registered users, legal
              professionals, and advertisers.
            </p>
            <p className="mt-4">
              By accessing or using JudgeFinder.io, you agree to comply with this AUP. Violations
              may result in account suspension, termination, legal action, or reporting to
              appropriate authorities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. General Usage Standards</h2>
            <p>
              You agree to use JudgeFinder.io in a lawful, ethical, and respectful manner. You must:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>
                Provide accurate and truthful information when creating an account or advertising
              </li>
              <li>Respect the privacy and rights of judges, attorneys, and other users</li>
              <li>Use the platform only for legitimate legal research and professional purposes</li>
              <li>Comply with all applicable federal, state, and local laws and regulations</li>
              <li>Maintain the confidentiality of your account credentials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Prohibited Activities</h2>
            <p className="font-semibold text-red-700">
              The following activities are strictly prohibited and may result in immediate account
              termination:
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Harassment and Defamation</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Harassment of Judges:</strong> Using the platform to harass, threaten,
                intimidate, or defame any judge, judicial officer, or court personnel
              </li>
              <li>
                <strong>False Statements:</strong> Making knowingly false or misleading statements
                about judges, courts, legal proceedings, or other users
              </li>
              <li>
                <strong>Personal Attacks:</strong> Posting or disseminating personal attacks,
                inflammatory statements, or hate speech directed at any individual
              </li>
              <li>
                <strong>Doxxing:</strong> Publishing private or confidential information about
                judges, attorneys, or other users without authorization
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.2 Data Misuse and Unauthorized Access
            </h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Automated Scraping:</strong> Using bots, scrapers, crawlers, or automated
                systems to extract data from the platform without written permission
              </li>
              <li>
                <strong>Bulk Downloads:</strong> Systematically downloading large portions of our
                database or judicial profiles
              </li>
              <li>
                <strong>Unauthorized Access:</strong> Attempting to access restricted areas, other
                users' accounts, or administrative systems
              </li>
              <li>
                <strong>API Abuse:</strong> Exceeding rate limits, reverse engineering APIs, or
                using our APIs for unauthorized purposes
              </li>
              <li>
                <strong>Data Resale:</strong> Selling, redistributing, or commercially exploiting
                data obtained from JudgeFinder.io
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.3 Security and System Integrity</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Security Violations:</strong> Attempting to breach, circumvent, or test the
                security of our systems
              </li>
              <li>
                <strong>Malicious Code:</strong> Uploading or transmitting viruses, malware,
                ransomware, or other harmful code
              </li>
              <li>
                <strong>Denial of Service:</strong> Engaging in activities that disrupt, degrade, or
                interfere with platform availability or performance
              </li>
              <li>
                <strong>Unauthorized Monitoring:</strong> Monitoring data or traffic on our systems
                without authorization
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.4 Fraudulent and Deceptive Practices
            </h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Identity Misrepresentation:</strong> Impersonating judges, attorneys, court
                officials, or other users
              </li>
              <li>
                <strong>Credential Fraud:</strong> Providing false bar numbers, credentials, or
                professional qualifications
              </li>
              <li>
                <strong>Fake Reviews:</strong> Creating fake accounts to post reviews, ratings, or
                testimonials
              </li>
              <li>
                <strong>Advertising Fraud:</strong> Click fraud, impression fraud, or manipulation
                of advertising metrics
              </li>
              <li>
                <strong>Payment Fraud:</strong> Using stolen payment methods or engaging in
                chargeback fraud
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.5 Improper Legal Use</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>FCRA Violations:</strong> Using judicial data for consumer credit,
                employment, insurance, or housing decisions (prohibited under the Fair Credit
                Reporting Act)
              </li>
              <li>
                <strong>Jury Tampering:</strong> Using the platform to influence jurors, witnesses,
                or court proceedings
              </li>
              <li>
                <strong>Obstruction of Justice:</strong> Any use that interferes with or obstructs
                judicial proceedings
              </li>
              <li>
                <strong>Unauthorized Practice of Law:</strong> Providing legal advice or services
                without proper licensure
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Professional Ethics for Attorneys</h2>
            <p className="font-semibold">
              Attorneys who use or advertise on JudgeFinder.io must comply with all applicable
              professional responsibility rules and attorney advertising regulations.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">4.1 Advertising Standards</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Truthful Advertising:</strong> All advertisements must be truthful, not
                misleading, and comply with state bar advertising rules
              </li>
              <li>
                <strong>No Guarantees:</strong> Do not guarantee specific legal outcomes or results
              </li>
              <li>
                <strong>Accurate Credentials:</strong> Represent your qualifications, experience,
                and specializations accurately
              </li>
              <li>
                <strong>Required Disclaimers:</strong> Include all disclaimers required by your
                state bar association
              </li>
              <li>
                <strong>Comparative Claims:</strong> Avoid misleading comparative or superlative
                claims ("best," "top-rated") unless substantiated
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">4.2 Professional Conduct</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Confidentiality:</strong> Maintain client confidentiality and do not
                disclose privileged information
              </li>
              <li>
                <strong>Conflicts of Interest:</strong> Do not solicit clients where conflicts of
                interest exist
              </li>
              <li>
                <strong>Competence:</strong> Only advertise in practice areas where you have actual
                experience and competence
              </li>
              <li>
                <strong>Communications with Represented Parties:</strong> Do not use the platform to
                improperly contact represented parties
              </li>
              <li>
                <strong>Ex Parte Communications:</strong> Do not attempt ex parte communications
                with judges through the platform
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">4.3 Bar Membership Requirements</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Maintain active, unrestricted license(s) in good standing</li>
              <li>
                Promptly notify JudgeFinder.io of any disciplinary actions, suspensions, or license
                changes
              </li>
              <li>
                Comply with Continuing Legal Education (CLE) requirements in your jurisdiction(s)
              </li>
              <li>Report any ethical violations you observe on the platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Content Standards</h2>
            <p>
              Any content you submit to JudgeFinder.io (including feedback, comments, reviews, or
              support requests) must comply with these standards:
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Prohibited Content</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>Defamatory, libelous, or slanderous statements</li>
              <li>Hate speech, discrimination, or harassment based on protected characteristics</li>
              <li>Sexually explicit, obscene, or pornographic material</li>
              <li>Violence, threats, or content promoting illegal activities</li>
              <li>Spam, commercial solicitation, or chain letters</li>
              <li>Misleading or fraudulent information</li>
              <li>Copyrighted material used without permission</li>
              <li>Private or confidential information disclosed without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Reporting Violations</h2>
            <p>
              If you become aware of conduct that violates this Acceptable Use Policy, please report
              it promptly:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>General Violations:</strong> Email abuse@judgefinder.io with a detailed
                description and supporting evidence
              </li>
              <li>
                <strong>Security Issues:</strong> Email security@judgefinder.io for security
                vulnerabilities or breaches
              </li>
              <li>
                <strong>Attorney Ethics Violations:</strong> Email ethics@judgefinder.io for
                professional conduct violations
              </li>
              <li>
                <strong>Data Accuracy Issues:</strong> Use the "Report Issue" button on judge
                profiles for data corrections
              </li>
            </ul>

            <p className="mt-4 font-semibold">
              We take all violation reports seriously and will investigate promptly. You may report
              violations anonymously, though providing contact information helps us investigate
              effectively.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Enforcement Actions</h2>
            <p>
              Violations of this Acceptable Use Policy may result in one or more of the following
              enforcement actions:
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">7.1 Administrative Actions</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Warning:</strong> First-time minor violations may result in a written
                warning
              </li>
              <li>
                <strong>Feature Restriction:</strong> Temporary or permanent restriction of specific
                platform features
              </li>
              <li>
                <strong>Account Suspension:</strong> Temporary suspension of account access (7-90
                days depending on severity)
              </li>
              <li>
                <strong>Account Termination:</strong> Permanent account closure and ban from the
                platform
              </li>
              <li>
                <strong>IP Ban:</strong> Blocking of IP addresses associated with severe or repeated
                violations
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">7.2 Additional Consequences</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Advertising Suspension:</strong> Immediate suspension of advertising
                campaigns without refund
              </li>
              <li>
                <strong>Credential Revocation:</strong> Removal of "Verified Attorney" badges for
                professional misconduct
              </li>
              <li>
                <strong>Bar Association Reporting:</strong> Reporting attorney violations to
                applicable state bar associations
              </li>
              <li>
                <strong>Law Enforcement Referral:</strong> Reporting criminal conduct to appropriate
                law enforcement agencies
              </li>
              <li>
                <strong>Legal Action:</strong> Pursuit of civil or criminal legal remedies for
                damages or harm caused
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">7.3 Factors Considered</h3>
            <p className="mt-2">
              We consider the following factors when determining appropriate enforcement action:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Severity and nature of the violation</li>
              <li>Whether the violation was intentional or accidental</li>
              <li>Prior violation history</li>
              <li>Harm caused to judges, users, or platform integrity</li>
              <li>User cooperation during the investigation</li>
              <li>Promptness in addressing the violation once notified</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Appeals Process</h2>
            <p>If your account has been suspended or terminated, you may appeal the decision:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Appeal Procedure</h3>
            <ol className="list-decimal pl-6 mt-2">
              <li className="mb-2">
                <strong>Submit Appeal:</strong> Email appeals@judgefinder.io within 30 days of the
                enforcement action
              </li>
              <li className="mb-2">
                <strong>Provide Information:</strong> Include your account email, case reference
                number, and detailed explanation
              </li>
              <li className="mb-2">
                <strong>Investigation:</strong> We will review your appeal and all relevant evidence
                within 14 business days
              </li>
              <li className="mb-2">
                <strong>Decision:</strong> You will receive a written decision via email explaining
                the outcome
              </li>
            </ol>

            <p className="mt-4 font-semibold">
              Appeal decisions are final. Repeated appeals of the same issue will not be considered.
              Creating new accounts to circumvent enforcement actions is prohibited and may result
              in additional penalties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Cooperation with Law Enforcement</h2>
            <p>
              JudgeFinder.io cooperates with law enforcement agencies and regulatory authorities. We
              may disclose user information, including account details, usage logs, and IP
              addresses, in response to:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Valid subpoenas, court orders, or search warrants</li>
              <li>National security letters or other lawful government requests</li>
              <li>Investigations of violations of law or this Acceptable Use Policy</li>
              <li>Emergency situations involving threats to life, safety, or judicial security</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Modifications to This Policy</h2>
            <p>
              We reserve the right to modify this Acceptable Use Policy at any time. Material
              changes will be communicated through:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Email notification to registered users</li>
              <li>Prominent notice on the platform homepage</li>
              <li>Updated "Effective Date" at the top of this policy</li>
            </ul>
            <p className="mt-4">
              Continued use of JudgeFinder.io after policy updates constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Severability</h2>
            <p>
              If any provision of this Acceptable Use Policy is found to be invalid, illegal, or
              unenforceable, the remaining provisions shall continue in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <p>For questions about this Acceptable Use Policy or to report violations, contact:</p>
            <p className="mt-2">
              <strong>General Inquiries:</strong> legal@judgefinder.io
              <br />
              <strong>Abuse Reports:</strong> abuse@judgefinder.io
              <br />
              <strong>Security Issues:</strong> security@judgefinder.io
              <br />
              <strong>Ethics Violations:</strong> ethics@judgefinder.io
              <br />
              <strong>Appeals:</strong> appeals@judgefinder.io
              <br />
              <br />
              Address: JudgeFinder.io, California, USA
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Related Policies</h2>
            <p>This Acceptable Use Policy should be read in conjunction with:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                - Comprehensive usage terms and legal agreements
              </li>
              <li>
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>{' '}
                - Data collection and protection practices
              </li>
              <li>
                <a href="/cookies" className="text-blue-600 hover:underline">
                  Cookie Policy
                </a>{' '}
                - Cookie usage and tracking information
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
