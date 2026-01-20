import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - VendGros",
  description: "Privacy Policy for VendGros marketplace platform",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Privacy Policy</h1>

          <p className="mb-6 text-sm text-gray-500">Last updated: January 2026</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">1. Introduction</h2>
              <p className="mb-4 text-gray-700">
                VendGros (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you use our marketplace platform.
              </p>
              <p className="text-gray-700">
                By using VendGros, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">2. Information We Collect</h2>

              <h3 className="mb-2 text-lg font-medium text-gray-800">2.1 Personal Information</h3>
              <p className="mb-4 text-gray-700">We may collect the following personal information:</p>
              <ul className="mb-4 list-disc pl-6 text-gray-700">
                <li>Name and email address</li>
                <li>Phone number (for verification and notifications)</li>
                <li>Postal code and location data (for geospatial search)</li>
                <li>Profile information you provide</li>
                <li>Payment information (processed securely via Stripe)</li>
              </ul>

              <h3 className="mb-2 text-lg font-medium text-gray-800">2.2 Usage Information</h3>
              <p className="mb-4 text-gray-700">We automatically collect:</p>
              <ul className="mb-4 list-disc pl-6 text-gray-700">
                <li>Device and browser information</li>
                <li>IP address and approximate location</li>
                <li>Pages visited and features used</li>
                <li>Search queries and listing interactions</li>
              </ul>

              <h3 className="mb-2 text-lg font-medium text-gray-800">2.3 Content You Provide</h3>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Listing photos and descriptions</li>
                <li>Messages between buyers and sellers</li>
                <li>Reviews and ratings</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
              <p className="mb-4 text-gray-700">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Provide and maintain our marketplace services</li>
                <li>Process transactions and send related notifications</li>
                <li>Enable location-based search for nearby listings</li>
                <li>Verify your identity and prevent fraud</li>
                <li>Send service updates, security alerts, and support messages</li>
                <li>Improve our platform through analytics and AI-powered features</li>
                <li>Moderate content to ensure community safety</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">4. Information Sharing</h2>
              <p className="mb-4 text-gray-700">We may share your information with:</p>
              <ul className="mb-4 list-disc pl-6 text-gray-700">
                <li><strong>Other Users:</strong> Buyers and sellers can see limited profile information during transactions</li>
                <li><strong>Service Providers:</strong> Third-party services that help us operate (Stripe for payments, Twilio for SMS, etc.)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
              <p className="text-gray-700">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">5. Data Security</h2>
              <p className="text-gray-700">
                We implement industry-standard security measures to protect your data, including encryption
                in transit and at rest, secure authentication, and regular security audits. However, no
                method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">6. Your Rights</h2>
              <p className="mb-4 text-gray-700">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of marketing communications</li>
                <li>Withdraw consent where applicable</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">7. Cookies and Tracking</h2>
              <p className="text-gray-700">
                We use cookies and similar technologies to maintain your session, remember preferences,
                and analyze usage patterns. You can control cookies through your browser settings, though
                this may affect some functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">8. Data Retention</h2>
              <p className="text-gray-700">
                We retain your information for as long as your account is active or as needed to provide
                services. We may retain certain information as required by law or for legitimate business
                purposes such as resolving disputes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">9. Children&apos;s Privacy</h2>
              <p className="text-gray-700">
                VendGros is not intended for users under 18 years of age. We do not knowingly collect
                information from children. If you believe we have collected information from a minor,
                please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">10. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">11. Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <p className="mt-2 text-gray-700">
                Email: <a href="mailto:privacy@vendgros.com" className="text-green-600 hover:underline">privacy@vendgros.com</a>
              </p>
            </section>
          </div>

          <div className="mt-8 flex gap-4 border-t pt-6">
            <Link href="/" className="text-green-600 hover:underline">
              &larr; Back to Home
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/terms-of-service" className="text-green-600 hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
