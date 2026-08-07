import Link from "next/link";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";

export const metadata = {
  title: "Cookie Policy — RapVault",
  description:
    "How I use essential cookies, optional preference storage, and offline app cache on RapVault — and how you control them.",
};

const EFFECTIVE = "August 7, 2026";

export default function CookiesPage() {
  return (
    <LegalPageShell
      active="cookies"
      eyebrow="Legal"
      title="Cookie Policy"
      description="This Cookie Policy explains how I use cookies and similar technologies on RapVault (including browser local storage and service-worker caches) and how you can manage your preferences."
      effectiveDate={EFFECTIVE}
      lastUpdated={EFFECTIVE}
      actions={<CookiePreferencesButton label="Manage cookie preferences" />}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          Cookies are small text files stored on your device. RapVault also uses
          local storage and, if you allow it, a service worker to support offline
          use. I ask for your permission before enabling optional storage
          categories. Essential cookies required for sign-in and security remain
          active so the Service can function.
        </p>
        <p>
          This Policy should be read together with my{" "}
          <Link href="/privacy">Privacy Policy</Link> and{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>

      <LegalSection id="essential" title="2. Essential cookies (always on)">
        <p>These are necessary to provide core functionality:</p>
        <ul>
          <li>
            <strong>Session authentication</strong> — keeps you signed in
            securely across requests;
          </li>
          <li>
            <strong>OAuth state</strong> — short-lived cookies used during Google
            sign-in / account linking to prevent CSRF-style attacks;
          </li>
          <li>
            <strong>Consent record</strong> — stores your cookie/storage choices
            so I do not re-prompt on every visit.
          </li>
        </ul>
        <p>
          Because these are strictly necessary, they cannot be disabled from the
          preference panel without breaking authentication.
        </p>
      </LegalSection>

      <LegalSection id="preferences" title="3. Preferences (optional)">
        <p>
          If you allow Preferences, I may store on-device settings such as theme,
          sidebar state, lyric font size, page size, spell-check preference, and
          editor split layout. These improve convenience and are not used for
          advertising.
        </p>
        <p>
          If you decline Preferences, those settings are not persisted (or are
          cleared), and the interface returns to defaults on new visits.
        </p>
      </LegalSection>

      <LegalSection id="functional" title="4. Offline &amp; app cache (optional)">
        <p>
          If you allow Offline &amp; app cache, RapVault may:
        </p>
        <ul>
          <li>Cache song and folder data locally for offline reading/editing;</li>
          <li>Queue pending edits while you are offline and sync when online;</li>
          <li>
            Register a service worker and use the Cache API so the app shell can
            load with limited connectivity.
          </li>
        </ul>
        <p>
          If you decline this category, I unregister the RapVault service
          worker (when present), delete related caches, and stop writing offline
          storage keys—reducing the risk of stale cache or storage errors.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="5. Third-party technologies">
        <p>
          I do not deploy third-party advertising cookies on RapVault. When you
          paste a YouTube beat URL, playback may involve YouTube/Google
          technologies under their policies. I use privacy-enhanced (“nocookie”)
          embed URLs where supported.
        </p>
        <p>
          Google sign-in is processed by Google under Google’s terms and privacy
          policy when you choose that option.
        </p>
      </LegalSection>

      <LegalSection id="manage" title="6. How to manage your choices">
        <p>You can change cookie and storage preferences at any time by:</p>
        <ul>
          <li>
            Using the <strong>Manage cookie preferences</strong> button on this
            page or in the site footer (“Cookie settings”);
          </li>
          <li>
            Opening <strong>Settings → Privacy</strong> when signed in;
          </li>
          <li>
            Clearing site data in your browser (which may also sign you out).
          </li>
        </ul>
        <p>
          Browser controls vary by vendor. Blocking all cookies may prevent
          sign-in from working.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="7. Duration">
        <p>
          Essential session cookies last for the configured session lifetime.
          OAuth state cookies are short-lived. Consent preferences are typically
          stored for up to one year (or until you change them). Local preference
          and offline keys remain until you clear them, change consent, or I
          purge them when you opt out.
        </p>
      </LegalSection>

      <LegalSection id="updates" title="8. Updates">
        <p>
          I may update this Cookie Policy to reflect product or legal changes.
          The “Last updated” date will be revised when I do. Continued use after
          updates constitutes acceptance where permitted by law.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="9. Contact">
        <p>
          Questions about cookies or storage may be directed to me,{" "}
          <strong>Saskrit Bhattarai</strong>, via{" "}
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
