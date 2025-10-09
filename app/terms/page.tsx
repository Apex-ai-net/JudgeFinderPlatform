import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Terms of Service - JudgeFinder.io',
  description: 'Terms of service and usage agreement for JudgeFinder.io',
}

export default function TermsPage(): JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">Effective Date: January 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using JudgeFinder.io ("the Service"), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p>
              JudgeFinder.io provides public information about judges in California courts,
              including:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Biographical and professional information</li>
              <li>Court assignments and jurisdictions</li>
              <li>Case statistics and decision patterns</li>
              <li>Data-driven analysis of judicial tendencies</li>
            </ul>
            <p className="mt-4">
              This information is derived from public court records and official databases.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Disclaimer of Legal Advice</h2>
            <p className="font-semibold">
              JudgeFinder.io does not provide legal advice. The information on this platform is for
              informational purposes only.
            </p>
            <p className="mt-2">
              Users should not rely on this information as a substitute for professional legal
              counsel. Always consult with a qualified attorney for legal matters.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Judicial Analytics Disclaimer</h2>
            <p className="font-semibold text-amber-700">
              IMPORTANT: Judicial bias indicators and analytical metrics are statistical analyses of
              case outcomes, not character judgments or assessments of judicial fitness.
            </p>
            <p className="mt-4">
              The bias patterns, tendency indicators, and statistical metrics displayed on this
              platform represent:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Mathematical analyses of publicly available case outcome data</li>
              <li>
                Statistical correlations that may reflect case mix, jurisdiction characteristics, or
                procedural factors rather than judicial bias
              </li>
              <li>
                Aggregated patterns that do not account for case-specific facts, legal complexities,
                or applicable law
              </li>
              <li>
                Trend indicators derived from historical data that may not predict future case
                outcomes
              </li>
            </ul>
            <p className="mt-4">
              These analytics should be interpreted as one data point among many factors to consider
              when researching judicial backgrounds. They do not constitute evidence of judicial
              misconduct, unfitness, or impropriety. Users should not rely solely on these metrics
              when making legal strategy decisions.
            </p>
            <p className="mt-4">
              Our methodology documentation is available at judgefinder.io/docs/methodology and is
              updated periodically to reflect improvements in our analytical approach.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Accuracy Limitations</h2>
            <p className="font-semibold">
              While we implement rigorous data validation processes, JudgeFinder.io makes no
              warranties regarding the completeness, accuracy, timeliness, or reliability of
              judicial data presented on this platform.
            </p>
            <h3 className="text-xl font-semibold mt-4 mb-2">Data Sources</h3>
            <p>Judicial information is primarily sourced from:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>
                CourtListener by the Free Law Project - public court records and judicial profiles
              </li>
              <li>Official California court websites and public databases</li>
              <li>State Bar of California records for attorney verification</li>
              <li>Public appointment and election records</li>
            </ul>
            <h3 className="text-xl font-semibold mt-4 mb-2">Known Limitations</h3>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>Minimum Case Threshold:</strong> Judges must have decided at least 500
                publicly available cases for bias analytics to be calculated. Profiles with
                insufficient case data will display limited analytics.
              </li>
              <li>
                <strong>Data Lag:</strong> Court data may be 30-90 days behind real-time court
                activity due to processing and publication delays by source systems.
              </li>
              <li>
                <strong>Sealed and Confidential Cases:</strong> Analytics do not include sealed
                cases, juvenile matters, family law cases with privacy orders, or other confidential
                proceedings.
              </li>
              <li>
                <strong>Historical Accuracy:</strong> Position histories and case assignments prior
                to 2010 may be incomplete or unavailable depending on court digitization efforts.
              </li>
              <li>
                <strong>Name Matching:</strong> Judges with common names or similar name spellings
                may occasionally have cases misattributed. We employ multi-factor matching
                algorithms to minimize errors.
              </li>
            </ul>
            <p className="mt-4">
              Users should independently verify critical information through official court sources
              before relying on it for legal proceedings or professional decisions. Report data
              inaccuracies to legal@judgefinder.io.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Advertising and Sponsored Content</h2>
            <p className="font-semibold">
              JudgeFinder.io displays paid advertising from legal professionals and law firms. All
              advertisements are clearly labeled as "Sponsored" or "Advertisement" to distinguish
              them from editorial content.
            </p>
            <h3 className="text-xl font-semibold mt-4 mb-2">Advertiser Disclosure</h3>
            <p>Advertisements may appear on:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>
                Judge profile pages - contextual placement based on practice areas and jurisdiction
              </li>
              <li>Court directory pages - geographic targeting based on court location</li>
              <li>Search results pages - displayed in designated sponsored sections</li>
            </ul>
            <p className="mt-4">
              <strong>Editorial Independence:</strong> Advertising relationships do not influence
              judicial analytics, search rankings, or editorial content. Bias calculations and
              statistical analyses are computed using objective algorithms without consideration of
              advertising relationships.
            </p>
            <h3 className="text-xl font-semibold mt-4 mb-2">Advertiser Standards</h3>
            <p>All advertisers must:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Be licensed attorneys in good standing with their state bar association</li>
              <li>Provide verified bar numbers and credentials</li>
              <li>Comply with applicable attorney advertising rules and ethics regulations</li>
              <li>Accurately represent their qualifications, experience, and case outcomes</li>
              <li>Not make misleading claims or guarantees about legal outcomes</li>
            </ul>
            <p className="mt-4">
              JudgeFinder.io does not endorse, recommend, or guarantee the quality of services
              provided by advertisers. Users should independently research and vet any attorney
              before engaging their services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Professional Verification</h2>
            <p>
              Legal professionals who advertise on JudgeFinder.io or claim "Verified Attorney"
              status agree to:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Provide accurate bar number(s) and jurisdiction(s) of licensure</li>
              <li>Maintain active, unrestricted license(s) in good standing</li>
              <li>
                Promptly notify JudgeFinder.io of any disciplinary actions, suspensions, or license
                status changes
              </li>
              <li>
                Comply with all applicable professional responsibility rules and attorney
                advertising regulations
              </li>
              <li>Not misrepresent their credentials, specializations, or case results</li>
            </ul>
            <p className="mt-4">
              We verify bar numbers through state bar databases at the time of account creation.
              However, we do not continuously monitor disciplinary records. Users should
              independently verify attorney credentials through their state bar association before
              engaging legal services.
            </p>
            <p className="mt-4 font-semibold">
              "Verified Attorney" badges indicate only that we have confirmed active bar membership
              at registration. They do not constitute endorsements, certifications of
              specialization, or quality assessments.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Acceptable Use</h2>
            <p>You agree to use JudgeFinder.io only for lawful purposes. You may not:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Use the Service to harass, defame, or intimidate any person</li>
              <li>Attempt to access restricted areas of the Service</li>
              <li>Interfere with the Service's operation or security</li>
              <li>Scrape or harvest data without written permission</li>
              <li>Use automated systems to access the Service excessively</li>
              <li>Misrepresent the information provided by the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Intellectual Property</h2>
            <p>
              The Service's design, features, and content (excluding public court data) are owned by
              JudgeFinder.io and protected by intellectual property laws. You may not:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Copy, modify, or distribute our proprietary content</li>
              <li>Use our trademarks without permission</li>
              <li>Reverse engineer our AI algorithms or analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. User Accounts</h2>
            <p>If you create an account, you are responsible for:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Maintaining the confidentiality of your credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us of any unauthorized use</li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, JudgeFinder.io shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your
              use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless JudgeFinder.io from any claims, damages, or
              expenses arising from your use of the Service or violation of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              , which describes how we collect, use, and protect your information. Additional
              information about cookies and tracking is available in our{' '}
              <a href="/cookies" className="text-blue-600 hover:underline">
                Cookie Policy
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              14. Fair Credit Reporting Act (FCRA) Notice
            </h2>
            <p className="font-semibold">
              We are not a consumer reporting agency and the Service is not a consumer report as
              defined by the Fair Credit Reporting Act (FCRA).
            </p>
            <p className="mt-2">
              You agree not to use any information obtained through the Service to make decisions
              about a person's eligibility for credit, insurance, employment, housing, or any other
              purpose that would constitute a consumer report under the FCRA. If you need
              information for an FCRA-permitted purpose, obtain it from a certified consumer
              reporting agency.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the Service
              after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">16. Termination</h2>
            <p>
              We may terminate or suspend your access to the Service at our discretion, without
              notice, for any violation of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">17. Governing Law</h2>
            <p>
              These terms are governed by the laws of California, United States. Any disputes shall
              be resolved in the courts of California.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">18. Contact Information</h2>
            <p>For questions about these Terms of Service, please contact us at:</p>
            <p className="mt-2">
              Email: legal@judgefinder.io
              <br />
              Address: JudgeFinder.io, California, USA
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">19. Additional Policies</h2>
            <p>Please review our additional legal policies for comprehensive information:</p>
            <ul className="list-disc pl-6 mt-2">
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
                - Cookie usage and management
              </li>
              <li>
                <a href="/acceptable-use" className="text-blue-600 hover:underline">
                  Acceptable Use Policy
                </a>{' '}
                - Detailed usage guidelines and prohibited activities
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
