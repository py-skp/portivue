// app/cookies/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies Policy — Portivue",
  description:
    "Cookies Policy for Portivue by Mudric Labs: types of cookies we use, why we use them, and how to manage preferences.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 leading-7 text-zinc-800">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Cookies Policy</h1>
      <p className="text-sm text-zinc-500">Effective date: {new Date().toLocaleDateString()}</p>

      <section className="mt-8 space-y-6">
        <p>
          This Cookies Policy explains how <strong>Portivue by Mudric Labs</strong> (“Portivue”, “we”)
          uses cookies and similar technologies in connection with our Services. For details on how we
          handle personal data, see our{" "}
          <a className="text-blue-600 underline" href="/privacy">
            Privacy Policy
          </a>.
        </p>

        <h2 className="text-xl font-bold">1) What Are Cookies?</h2>
        <p>
          Cookies are small text files placed on your device to store information. They help operate,
          secure, and improve our Services, and remember preferences.
        </p>

        <h2 className="text-xl font-bold">2) Types of Cookies We Use</h2>
        <ul className="list-disc pl-6">
          <li>
            <b>Essential:</b> Required for authentication, security, and core functionality (e.g.,
            session cookies).
          </li>
          <li>
            <b>Functional:</b> Remember preferences such as language, theme, and layout.
          </li>
          <li>
            <b>Analytics:</b> Help us understand usage and performance (e.g., page views, errors).
          </li>
          <li>
            <b>Third-Party:</b> Set by integrated providers (e.g., identity providers, analytics).
          </li>
        </ul>

        <h2 className="text-xl font-bold">3) Why We Use Cookies</h2>
        <ul className="list-disc pl-6">
          <li>Keep you signed in and maintain sessions.</li>
          <li>Protect accounts and prevent fraud/abuse.</li>
          <li>Measure performance and improve features.</li>
          <li>Provide optional personalization.</li>
        </ul>

        <h2 className="text-xl font-bold">4) Managing Cookies</h2>
        <p>
          Most browsers allow you to block or delete cookies via settings. If you disable essential
          cookies, parts of the Services may not function. Some third-party cookies can be managed
          through provider opt-out pages.
        </p>

        <h2 className="text-xl font-bold">5) No Liability</h2>
        <p>
          To the maximum extent permitted by law, Portivue assumes no responsibility for any issues
          arising from your use, blocking, or deletion of cookies, including the behavior of
          third-party cookies or loss of functionality resulting from cookie preferences.
        </p>

        <h2 className="text-xl font-bold">6) Changes</h2>
        <p>
          We may update this Cookies Policy occasionally. Changes are effective when posted. Continued
          use of the Services constitutes acceptance.
        </p>

        <h2 className="text-xl font-bold">7) Contact</h2>
        <p>
          Questions about cookies?{" "}
          <a className="text-blue-600 underline" href="mailto:info@mudric.com">info@mudric.com</a>
        </p>
      </section>
    </main>
  );
}