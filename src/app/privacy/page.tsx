import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";

export const metadata = {
  title: "Privacy Policy — RapVault",
  description:
    "How RapVault collects, uses, stores, and protects your personal information and creative content.",
};

const EFFECTIVE = "August 7, 2026";

export default function PrivacyPage() {
  return (
    <LegalPageShell
      active="privacy"
      eyebrow="Legal"
      title="Privacy Policy"
      description="This Privacy Policy explains how RapVault (“RapVault,” “we,” “us,” or “our”) collects, uses, discloses, and safeguards information when you use our website, web application, and related services (collectively, the “Service”)."
      effectiveDate={EFFECTIVE}
      lastUpdated={EFFECTIVE}
    >
      <LegalSection id="who" title="1. Who we are">
        <p>
          RapVault is a private lyrics notebook and creative workspace operated by{" "}
          <strong>Saskrit Bhattarai</strong>. For privacy inquiries, contact us via{" "}
          <a
            href="https://saskritbhattarai.com.np/"
            target="_blank"
            rel="noopener noreferrer"
          >
            saskritbhattarai.com.np
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="scope" title="2. Scope">
        <p>
          This Policy applies to information processed through RapVault,
          including account registration, song and folder storage, collaboration
          features, public artist profiles, messaging, authentication (email or
          Google), optional offline/device storage, and related support
          communications.
        </p>
        <p>
          It does not apply to third-party websites or services that we do not
          control, including Google account pages, YouTube, or links you choose
          to open from within the Service.
        </p>
      </LegalSection>

      <LegalSection id="collect" title="3. Information we collect">
        <p>
          <strong>Account information.</strong> When you create or manage an
          account, we may collect your email address, password (stored as a
          secure hash if you use email/password sign-in), display name,
          username, profile bio, avatar image, recovery email, profile
          visibility setting, and linked social URLs you provide.
        </p>
        <p>
          <strong>Authentication with Google.</strong> If you sign in or link
          Google, we receive identifiers and profile details Google provides
          (such as Google account ID, email, and name) as needed to authenticate
          you and maintain the link to your RapVault account.
        </p>
        <p>
          <strong>Creative content.</strong> We store the content you create or
          upload in the Service, including song titles, lyrics, genres, mood
          tags, folder organization, favorites, draft/finished status, beat
          URLs, collaboration relationships, and public-song engagement data
          (such as view counts and reactions) where those features are used.
        </p>
        <p>
          <strong>Communications.</strong> If you use direct messages or
          network/connection features, we process the related message content
          and connection metadata necessary to deliver those features.
        </p>
        <p>
          <strong>Technical and usage data.</strong> Our hosting and security
          infrastructure may automatically process IP address, browser type,
          device information, timestamps, and request logs needed to operate,
          secure, and troubleshoot the Service. We do not use third-party
          advertising trackers on RapVault.
        </p>
        <p>
          <strong>Device storage (with consent).</strong> Subject to your
          cookie/storage choices, your device may store preference settings,
          offline song caches, pending sync queues, and service-worker caches.
          See our{" "}
          <Link href="/cookies">Cookie Policy</Link> for details.
        </p>
      </LegalSection>

      <LegalSection id="use" title="4. How we use information">
        <p>We use information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service;</li>
          <li>Authenticate users and protect accounts;</li>
          <li>Store and sync your lyrics vault and related metadata;</li>
          <li>
            Enable collaboration, public sharing, artist profiles, messaging, and
            network features you use;
          </li>
          <li>Respond to support requests and enforce our Terms;</li>
          <li>
            Detect, prevent, and investigate fraud, abuse, or security incidents;
          </li>
          <li>Comply with applicable law and lawful requests.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information, and we do
          not use your private lyrics content for advertising.
        </p>
      </LegalSection>

      <LegalSection id="legal-bases" title="5. Legal bases (where applicable)">
        <p>
          Where required (for example under the GDPR/UK GDPR), we process
          personal data on the basis of: (a) performance of a contract with you;
          (b) your consent (including optional cookies/storage); (c) our
          legitimate interests in operating a secure creative Service; and/or
          (d) compliance with legal obligations.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="6. How we share information">
        <p>We may share information with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> that host or operate
            infrastructure on our behalf (for example cloud hosting, database,
            and email delivery providers), under obligations to protect your
            data;
          </li>
          <li>
            <strong>Other users</strong>, when you publish content, collaborate
            on a song, make a profile public, send messages, or otherwise choose
            to share;
          </li>
          <li>
            <strong>Google</strong>, when you initiate Google sign-in or account
            linking (subject to Google’s terms and privacy policy);
          </li>
          <li>
            <strong>Authorities</strong>, if required by law or to protect
            rights, safety, and security;
          </li>
          <li>
            <strong>Successors</strong>, in connection with a merger,
            acquisition, or asset transfer, subject to appropriate safeguards.
          </li>
        </ul>
        <p>
          If you embed or open a YouTube beat link, YouTube/Google may process
          data under their own policies. RapVault uses privacy-enhanced YouTube
          embed URLs where applicable.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="7. Retention">
        <p>
          We retain account and content data for as long as your account remains
          active and as needed to provide the Service. Soft-deleted songs may be
          retained for a recovery period before permanent deletion. Server logs
          are retained for a limited period for security and operations. You may
          request account or content deletion as described below.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. Security">
        <p>
          We implement reasonable technical and organizational measures designed
          to protect information, including encrypted transport (HTTPS), hashed
          passwords, and access controls. No method of transmission or storage is
          completely secure; you use the Service at your own residual risk. Keep
          your credentials confidential and notify us of suspected unauthorized
          access.
        </p>
      </LegalSection>

      <LegalSection id="international" title="9. International transfers">
        <p>
          RapVault may be hosted and processed in countries other than your own.
          Where required, we take steps intended to ensure an adequate level of
          protection for personal data transferred internationally.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="10. Your rights and choices">
        <p>Depending on your location, you may have rights to:</p>
        <ul>
          <li>Access, correct, or update account information;</li>
          <li>Export or download your lyrics (where the Service provides export tools);</li>
          <li>Delete content or request account deletion;</li>
          <li>Withdraw consent for optional cookies/storage;</li>
          <li>Object to or restrict certain processing;</li>
          <li>Lodge a complaint with a supervisory authority.</li>
        </ul>
        <p>
          You can manage many settings in-product (profile, privacy of songs,
          cookie preferences). For other requests, contact us using the details
          in Section 1. We may need to verify your identity before acting.
        </p>
      </LegalSection>

      <LegalSection id="children" title="11. Children’s privacy">
        <p>
          The Service is not directed to children under 13 (or the minimum age
          required in your jurisdiction). We do not knowingly collect personal
          information from children. If you believe a child has provided us
          personal information, contact us and we will take appropriate steps.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to this Policy">
        <p>
          We may update this Privacy Policy from time to time. The “Last updated”
          date will change when we do. Material changes may be highlighted in
          the Service or by other reasonable means. Continued use after an update
          constitutes acceptance of the revised Policy to the extent permitted by
          law.
        </p>
      </LegalSection>

      <LegalSection id="related" title="13. Related documents">
        <p>
          Please also review our <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/cookies">Cookie Policy</Link>, which form part of our
          legal framework for using RapVault.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
