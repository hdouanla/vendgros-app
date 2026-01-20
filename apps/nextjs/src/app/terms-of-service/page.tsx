import Link from "next/link";

export const metadata = {
  title: "Terms of Service - VendGros",
  description: "Terms of Service for VendGros marketplace platform",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Terms of Service</h1>

          <p className="mb-6 text-sm text-gray-500">Last updated: January 2026</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing or using VendGros (&quot;the Platform&quot;), you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">2. Description of Service</h2>
              <p className="text-gray-700">
                VendGros is a local marketplace platform that connects bulk sellers (restaurants, bakeries,
                farms, and other businesses) with buyers seeking affordable goods. We facilitate transactions
                but are not a party to the actual sale between buyers and sellers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">3. User Accounts</h2>

              <h3 className="mb-2 text-lg font-medium text-gray-800">3.1 Registration</h3>
              <p className="mb-4 text-gray-700">
                To use certain features, you must create an account. You agree to provide accurate,
                current, and complete information and keep it updated.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">3.2 Account Security</h3>
              <p className="mb-4 text-gray-700">
                You are responsible for maintaining the confidentiality of your account credentials
                and for all activities that occur under your account.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">3.3 Age Requirement</h3>
              <p className="text-gray-700">
                You must be at least 18 years old to use VendGros.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">4. Buyer Terms</h2>

              <h3 className="mb-2 text-lg font-medium text-gray-800">4.1 Reservations</h3>
              <p className="mb-4 text-gray-700">
                When you reserve items, you commit to completing the purchase. A 5% deposit is required
                to secure your reservation.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">4.2 Pickup Obligations</h3>
              <p className="mb-4 text-gray-700">
                You must pick up reserved items within the specified timeframe. Failure to pick up items
                may result in forfeiture of your deposit.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">4.3 Payment</h3>
              <p className="text-gray-700">
                The remaining balance (95%) is paid directly to the seller at pickup. VendGros processes
                only the deposit payment.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">5. Seller Terms</h2>

              <h3 className="mb-2 text-lg font-medium text-gray-800">5.1 Listing Requirements</h3>
              <p className="mb-4 text-gray-700">
                Sellers must provide accurate descriptions, photos, and pricing for their listings.
                All items must comply with applicable food safety and business regulations.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">5.2 Phone Verification</h3>
              <p className="mb-4 text-gray-700">
                Sellers must verify their phone number before creating listings to ensure buyer safety
                and communication reliability.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">5.3 Fulfillment</h3>
              <p className="mb-4 text-gray-700">
                Sellers must honor confirmed reservations and provide items as described. Failure to
                fulfill orders may result in account suspension.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">5.4 No-Show Policy</h3>
              <p className="text-gray-700">
                If a buyer fails to pick up their order, sellers may keep the 5% deposit as compensation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">6. Prohibited Activities</h2>
              <p className="mb-4 text-gray-700">Users may not:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Post false, misleading, or fraudulent content</li>
                <li>Sell prohibited, illegal, or unsafe items</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Circumvent platform fees or safety features</li>
                <li>Create multiple accounts to evade restrictions</li>
                <li>Scrape or collect user data without authorization</li>
                <li>Interfere with platform operations or security</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">7. Content and Moderation</h2>

              <h3 className="mb-2 text-lg font-medium text-gray-800">7.1 User Content</h3>
              <p className="mb-4 text-gray-700">
                You retain ownership of content you post but grant VendGros a license to use, display,
                and distribute it on the platform.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">7.2 Moderation</h3>
              <p className="text-gray-700">
                We use automated systems and human review to moderate content. We may remove content
                or suspend accounts that violate these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">8. Ratings and Reviews</h2>
              <p className="mb-4 text-gray-700">
                Our blind rating system ensures fair feedback. Both parties must submit reviews before
                ratings are visible. Reviews must be honest and based on actual transactions.
              </p>
              <p className="text-gray-700">
                Manipulating ratings or posting false reviews is prohibited and may result in account termination.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">9. Fees and Payments</h2>
              <p className="mb-4 text-gray-700">
                VendGros charges a service fee on deposit payments. Current fees are disclosed during checkout.
                Payment processing is handled securely by Stripe.
              </p>
              <p className="text-gray-700">
                We reserve the right to modify fees with reasonable notice to users.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">10. Disclaimers</h2>

              <h3 className="mb-2 text-lg font-medium text-gray-800">10.1 Platform Role</h3>
              <p className="mb-4 text-gray-700">
                VendGros is a marketplace platform only. We do not own, produce, or inspect items listed
                by sellers. We are not responsible for the quality, safety, or legality of listed items.
              </p>

              <h3 className="mb-2 text-lg font-medium text-gray-800">10.2 No Warranty</h3>
              <p className="text-gray-700">
                The platform is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
                uninterrupted or error-free service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">11. Limitation of Liability</h2>
              <p className="text-gray-700">
                To the maximum extent permitted by law, VendGros shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages arising from your use of the
                platform or any transactions conducted through it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">12. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold VendGros harmless from any claims, damages, or expenses
                arising from your use of the platform, your content, or your violation of these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">13. Dispute Resolution</h2>
              <p className="mb-4 text-gray-700">
                We encourage users to resolve disputes directly. For unresolved issues, contact our
                support team. We may mediate disputes but are not obligated to do so.
              </p>
              <p className="text-gray-700">
                Any legal disputes shall be governed by the laws of the Province of Quebec, Canada.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">14. Account Termination</h2>
              <p className="text-gray-700">
                We may suspend or terminate accounts that violate these terms. You may delete your
                account at any time through your profile settings. Some information may be retained
                as required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">15. Changes to Terms</h2>
              <p className="text-gray-700">
                We may modify these Terms of Service at any time. Continued use of the platform after
                changes constitutes acceptance of the new terms. We will notify users of significant changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">16. Contact Information</h2>
              <p className="text-gray-700">
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="mt-2 text-gray-700">
                Email: <a href="mailto:legal@vendgros.com" className="text-green-600 hover:underline">legal@vendgros.com</a>
              </p>
            </section>
          </div>

          <div className="mt-8 flex gap-4 border-t pt-6">
            <Link href="/" className="text-green-600 hover:underline">
              &larr; Back to Home
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/privacy-policy" className="text-green-600 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
