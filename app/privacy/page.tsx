export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: April 8, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          MK Marketing Platform (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;) is operated by GEC Business
          (&quot;GEC&quot;). This Privacy Policy explains how we collect, use, store, and protect data
          when you use our multi-tenant social media management platform.
        </p>

        <h2 className="text-xl font-semibold mt-8">1. Information We Collect</h2>
        <p>
          We collect information you provide directly (business name, contact email, social media
          page details, content uploads) and information from connected platforms (Facebook,
          Instagram, LinkedIn, TikTok) via OAuth, including page access tokens, ad account
          identifiers, and post engagement metrics.
        </p>

        <h2 className="text-xl font-semibold mt-8">2. How We Use Information</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>To generate and publish social media content on behalf of clients</li>
          <li>To run paid advertising campaigns on connected ad accounts (with explicit authorization)</li>
          <li>To analyze content performance and produce reports</li>
          <li>To bill clients for management services rendered</li>
          <li>To monitor system health and detect issues</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">3. Data Storage and Security</h2>
        <p>
          All data is stored on encrypted servers operated by GEC. API credentials and access
          tokens are encrypted at rest using AES-256-GCM. We never sell, rent, or trade your data
          to third parties. Access is limited to authorized GEC operators (Tea, IT) and the tenant
          themselves through their portal.
        </p>

        <h2 className="text-xl font-semibold mt-8">4. Third-Party Services</h2>
        <p>
          We integrate with the following services to deliver our platform features:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Meta (Facebook + Instagram)</strong> — for posting content and managing ads</li>
          <li><strong>LinkedIn</strong> — for posting content and managing ads</li>
          <li><strong>TikTok</strong> — for posting content</li>
          <li><strong>Anthropic Claude</strong> — for AI-powered content generation</li>
          <li><strong>OpenAI DALL-E</strong> — for AI-generated images</li>
          <li><strong>Google Maps</strong> — for business research during onboarding</li>
        </ul>
        <p>
          When ads management is enabled, we transmit campaign configurations, ad creatives, and
          targeting specifications to Meta and LinkedIn ad systems. We do not share custom audience
          data without explicit tenant consent.
        </p>

        <h2 className="text-xl font-semibold mt-8">5. Custom Audiences and Pixel Data</h2>
        <p>
          If a tenant uploads customer data for custom audience matching, that data is hashed
          before being sent to advertising platforms in compliance with their data processing
          terms. Pixel events are collected only on websites where the tenant has installed the
          tracking pixel and obtained user consent per their own privacy notice.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Data Retention</h2>
        <p>
          Tenant data is retained for the duration of the service contract plus 90 days for
          backup purposes. Backups are kept for 30 days in encrypted form. Upon contract
          termination, tenants may request immediate deletion via the data deletion endpoint
          described below.
        </p>

        <h2 className="text-xl font-semibold mt-8">7. Data Deletion Rights</h2>
        <p>
          Tenants may request deletion of all their data at any time. To request deletion:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Email <a className="text-blue-600 hover:underline" href="mailto:it@gecbusiness.com">it@gecbusiness.com</a> with subject &quot;Data Deletion Request&quot;</li>
          <li>Or POST to <code className="bg-gray-100 px-1 py-0.5 rounded">https://mk.gecbusiness.com/api/data-deletion</code> with the tenant&apos;s confirmation code</li>
        </ul>
        <p>
          We will permanently delete all tenant data within 30 days and confirm completion via
          email. Backups will be purged within 90 days.
        </p>

        <h2 className="text-xl font-semibold mt-8">8. Your Rights (GDPR)</h2>
        <p>
          You have the right to access, correct, export, or delete your personal data. To exercise
          these rights, contact us at <a className="text-blue-600 hover:underline" href="mailto:it@gecbusiness.com">it@gecbusiness.com</a>.
        </p>

        <h2 className="text-xl font-semibold mt-8">9. Contact</h2>
        <p>
          GEC Business<br />
          Email: <a className="text-blue-600 hover:underline" href="mailto:it@gecbusiness.com">it@gecbusiness.com</a><br />
          Platform: <a className="text-blue-600 hover:underline" href="https://mk.gecbusiness.com">https://mk.gecbusiness.com</a>
        </p>
      </section>
    </div>
  );
}
