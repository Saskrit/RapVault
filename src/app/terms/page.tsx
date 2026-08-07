import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";

export const metadata = {
  title: "Terms of Service — RapVault",
  description:
    "The terms that govern your use of RapVault, including accounts, content ownership, acceptable use, and liability.",
};

const EFFECTIVE = "August 7, 2026";

export default function TermsPage() {
  return (
    <LegalPageShell
      active="terms"
      eyebrow="Legal"
      title="Terms of Service"
      description="These Terms of Service (“Terms”) govern your access to and use of RapVault (the “Service”). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use RapVault."
      effectiveDate={EFFECTIVE}
      lastUpdated={EFFECTIVE}
    >
      <LegalSection id="agreement" title="1. Agreement to Terms">
        <p>
          These Terms form a binding agreement between you and{" "}
          <strong>Saskrit Bhattarai</strong>, operator of RapVault. Additional
          policies referenced herein—including our{" "}
          <Link href="/privacy">Privacy Policy</Link> and{" "}
          <Link href="/cookies">Cookie Policy</Link>—are incorporated by
          reference.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility">
        <p>
          You must be at least 13 years old (or the age of digital consent in
          your jurisdiction) to use the Service. If you use RapVault on behalf of
          an organization, you represent that you have authority to bind that
          organization to these Terms.
        </p>
      </LegalSection>

      <LegalSection id="account" title="3. Accounts and security">
        <p>
          You are responsible for maintaining the confidentiality of your login
          credentials and for all activity under your account. Provide accurate
          registration information and keep it updated. Notify us promptly of
          any unauthorized use. We may suspend or terminate accounts that appear
          compromised, abusive, or in violation of these Terms.
        </p>
        <p>
          Google sign-in and linking are subject to Google’s own terms. You must
          ensure you have the right to connect any third-party account you link.
        </p>
      </LegalSection>

      <LegalSection id="service" title="4. The Service">
        <p>
          RapVault provides tools to write, organize, store, collaborate on, and
          optionally publish lyrics and related creative materials. Features may
          include folders, search, beat links, export, offline caching (with
          consent), artist profiles, messaging, and analytics related to your
          vault. We may modify, suspend, or discontinue features with or without
          notice, subject to applicable law.
        </p>
        <p>
          The Service is provided on an “as available” basis. We do not
          guarantee uninterrupted or error-free operation, or that offline mode
          will capture every edit in every network condition.
        </p>
      </LegalSection>

      <LegalSection id="content" title="5. Your content">
        <p>
          <strong>Ownership.</strong> You retain all rights to the lyrics and
          other content you create or upload (“User Content”). These Terms do
          not transfer ownership of your songs to RapVault.
        </p>
        <p>
          <strong>License to operate the Service.</strong> You grant us a
          limited, worldwide, non-exclusive license to host, store, process,
          transmit, display, and back up User Content solely as needed to
          provide and secure the Service and features you enable (including
          collaboration and public sharing).
        </p>
        <p>
          <strong>Public and shared content.</strong> If you mark a song public,
          share a profile, invite collaborators, or send messages, you understand
          that other users (and, for public content, visitors) may view or
          interact with that content according to the feature’s design.
        </p>
        <p>
          <strong>Responsibility.</strong> You are solely responsible for User
          Content, including its legality, originality, and any rights needed to
          use beats, samples, or third-party material referenced in your work.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Service for unlawful, harmful, fraudulent, or abusive
            purposes;
          </li>
          <li>
            Upload or share content that infringes intellectual property,
            privacy, or other rights;
          </li>
          <li>
            Harass, threaten, or exploit others through messages, profiles, or
            public content;
          </li>
          <li>
            Attempt to gain unauthorized access to accounts, systems, or data;
          </li>
          <li>
            Interfere with or disrupt the Service, including via malware,
            scraping at abusive scale, or overloading infrastructure;
          </li>
          <li>
            Reverse engineer the Service except where such restriction is
            prohibited by law;
          </li>
          <li>
            Misrepresent your identity or affiliation in a deceptive manner.
          </li>
        </ul>
        <p>
          We may remove content or restrict access when we reasonably believe
          these rules have been violated.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="7. RapVault intellectual property">
        <p>
          The RapVault name, logos, interface, software, and documentation are
          owned by us or our licensors and are protected by intellectual property
          laws. Except for the limited rights expressly granted to use the
          Service, no license to our IP is granted.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="8. Third-party services">
        <p>
          The Service may integrate or link to third parties (for example Google
          authentication or YouTube beat playback). Those services are governed
          by their own terms and privacy policies. We are not responsible for
          third-party services you choose to use.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="9. Disclaimers">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS
          IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER
          EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT YOUR CONTENT WILL NEVER BE
          LOST; YOU SHOULD KEEP YOUR OWN BACKUPS OF IMPORTANT WORK.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="10. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, RAPVAULT AND ITS OPERATOR
          SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
          DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR RELATED TO
          YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
          DAMAGES.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE
          SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US
          FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE
          HUNDRED U.S. DOLLARS (US $100), IF YOU HAVE NOT PAID ANY FEES.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations; in those cases,
          our liability is limited to the fullest extent permitted.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="11. Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless RapVault and its
          operator from and against claims, damages, losses, and expenses
          (including reasonable legal fees) arising out of your User Content,
          your use of the Service, or your violation of these Terms or
          applicable law.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="12. Termination">
        <p>
          You may stop using the Service at any time and may request account
          deletion. We may suspend or terminate access immediately if you
          breach these Terms, if required by law, or if we discontinue the
          Service. Provisions that by their nature should survive (including
          ownership, disclaimers, limitations, and indemnity) will survive
          termination.
        </p>
      </LegalSection>

      <LegalSection id="law" title="13. Governing law">
        <p>
          These Terms are governed by the laws of Nepal, without regard to
          conflict-of-law principles, unless mandatory consumer protections in
          your country of residence require otherwise. Courts located in Nepal
          shall have exclusive jurisdiction over disputes arising from these
          Terms, except where applicable law gives you the right to bring claims
          in your local courts.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="14. Changes to these Terms">
        <p>
          We may update these Terms from time to time. The “Last updated” date
          will be revised accordingly. If changes are material, we may provide
          additional notice. Continued use of the Service after changes become
          effective constitutes acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="15. Contact">
        <p>
          Questions about these Terms may be directed to{" "}
          <strong>Saskrit Bhattarai</strong> via{" "}
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
    </LegalPageShell>
  );
}
