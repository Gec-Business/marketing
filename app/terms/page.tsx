export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: April 28, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of MK Marketing Platform
          (&quot;Platform&quot;), operated by GEC Business (&quot;GEC&quot;, &quot;we&quot;, &quot;us&quot;).
          By accessing or using the Platform, you agree to these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8">1. Description of Service</h2>
        <p>
          MK Marketing Platform is a social media management service that enables businesses to
          schedule and publish content to connected social media accounts (Facebook, Instagram,
          LinkedIn, TikTok), generate AI-powered content, and manage marketing campaigns.
        </p>

        <h2 className="text-xl font-semibold mt-8">2. Account Responsibilities</h2>
        <p>
          You are responsible for maintaining the confidentiality of your login credentials and
          for all activity that occurs under your account. You must notify us immediately of any
          unauthorized use at <a className="text-blue-600 hover:underline" href="mailto:it@gecbusiness.com">it@gecbusiness.com</a>.
        </p>

        <h2 className="text-xl font-semibold mt-8">3. Permitted Use</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Publishing social media content to accounts you own or are authorized to manage</li>
          <li>Scheduling posts and automating content distribution</li>
          <li>Using AI tools to generate content for your business</li>
          <li>Viewing performance analytics and reports</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">4. Prohibited Use</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Publishing content that violates the terms of any connected social media platform</li>
          <li>Using the Platform to distribute spam, misleading, or illegal content</li>
          <li>Attempting to access accounts or data belonging to other tenants</li>
          <li>Reverse engineering or attempting to extract the Platform&apos;s source code</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">5. TikTok Integration</h2>
        <p>
          When you connect a TikTok account, you authorize MK Marketing Platform to publish
          videos to your TikTok account on your behalf using the TikTok Content Posting API.
          You retain full ownership of your content. You may revoke this authorization at any
          time by disconnecting your TikTok account in the Platform settings or through TikTok&apos;s
          own app settings.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Content Ownership</h2>
        <p>
          You retain all rights to content you upload or generate through the Platform.
          By using the Platform, you grant GEC a limited license to store and transmit
          your content solely for the purpose of delivering the service.
        </p>

        <h2 className="text-xl font-semibold mt-8">7. Service Availability</h2>
        <p>
          We aim to provide continuous service availability but do not guarantee uninterrupted
          access. Scheduled maintenance, third-party API outages, or force majeure events may
          cause temporary disruptions.
        </p>

        <h2 className="text-xl font-semibold mt-8">8. Billing</h2>
        <p>
          Service fees are invoiced monthly as agreed in your service contract with GEC Business.
          Invoices are delivered by email. Failure to pay within the agreed period may result in
          suspension of service.
        </p>

        <h2 className="text-xl font-semibold mt-8">9. Termination</h2>
        <p>
          Either party may terminate the service with 30 days written notice. Upon termination,
          your data will be retained for 90 days then permanently deleted unless you request
          earlier deletion.
        </p>

        <h2 className="text-xl font-semibold mt-8">10. Limitation of Liability</h2>
        <p>
          GEC Business shall not be liable for any indirect, incidental, or consequential damages
          arising from your use of the Platform, including but not limited to loss of revenue
          resulting from delayed or failed social media posts.
        </p>

        <h2 className="text-xl font-semibold mt-8">11. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the Platform after
          changes constitutes acceptance of the new Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8">12. Contact</h2>
        <p>
          GEC Business<br />
          Email: <a className="text-blue-600 hover:underline" href="mailto:it@gecbusiness.com">it@gecbusiness.com</a><br />
          Platform: <a className="text-blue-600 hover:underline" href="https://mk.gecbusiness.com">https://mk.gecbusiness.com</a>
        </p>
      </section>
    </div>
  );
}
