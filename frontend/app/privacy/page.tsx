"use client";

import { LegalLayout } from "@/components/LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout>
      <div className="mx-auto max-w-4xl px-6 leading-7 text-zinc-800 dark:text-slate-300">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight dark:text-white">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 dark:text-slate-500">Effective date: {new Date().toLocaleDateString()}</p>

        <section className="mt-8 space-y-6">
          <p>
            This Privacy Policy describes how <strong>Portivue by Mudric Labs</strong> (“Portivue”,
            “we”, “us”, or “our”) collects, uses, shares, and safeguards information in connection
            with our Services. By using the Services, you agree to this Policy.
          </p>

          <h2 className="text-xl font-bold dark:text-white">1) Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <b>Account Data:</b> name, email, authentication identifiers (including federated login
              IDs and 2FA secrets where applicable).
            </li>
            <li>
              <b>Portfolio Data:</b> linked accounts, balances, holdings, transactions, dividends, FX
              rates/impacts, pricing, and analytics derived from your data.
            </li>
            <li>
              <b>Usage & Device Data:</b> IP address, device/browser type, OS, pages viewed, app
              telemetry, crash reports, and diagnostics.
            </li>
            <li>
              <b>Cookies & Similar Tech:</b> See our <a className="text-emerald-600 underline" href="/cookies">Cookies Policy</a>.
            </li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white">2) How We Use Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, operate, personalize, and improve the Services.</li>
            <li>Aggregate and display your portfolio information securely.</li>
            <li>Authenticate users, prevent fraud/abuse, and ensure security.</li>
            <li>Comply with legal obligations and enforce Terms.</li>
            <li>Communicate administrative updates and service notices.</li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white">3) Legal Bases (GDPR)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Performance of a contract (providing the Services you request).</li>
            <li>Legitimate interests (security, improvement, analytics, fraud prevention).</li>
            <li>Consent (where required, e.g., certain cookies/marketing).</li>
            <li>Compliance with legal obligations.</li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white">4) Sharing of Information</h2>
          <p>We <b>do not sell</b> your personal or portfolio data. We may share:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              With service providers (hosting, storage, analytics, customer support) under
              confidentiality and data-processing agreements.
            </li>
            <li>With authorities if required by law, subpoena, or court order.</li>
            <li>In corporate transactions (merger, acquisition, restructuring), with notice where feasible.</li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white">5) Security</h2>
          <p>
            We implement administrative, technical, and physical safeguards, including encryption in
            transit, access controls, and monitoring. However, <b>no method of transmission or storage
              is 100% secure</b>; we cannot guarantee absolute security, and you use the Services at your
            own risk.
          </p>

          <h2 className="text-xl font-bold dark:text-white">6) Data Retention</h2>
          <p>
            We retain data for as long as necessary to provide the Services and for legitimate business
            or legal purposes. You may request deletion of your account and data (subject to exceptions
            permitted by law).
          </p>

          <h2 className="text-xl font-bold dark:text-white">7) Your Rights</h2>
          <p>
            Depending on your jurisdiction (e.g., GDPR, CCPA/CPRA), you may have rights to access,
            correct, delete, restrict, object to processing, or request portability of your data, and
            to withdraw consent. To exercise rights, contact{" "}
            <a className="text-emerald-600 underline" href="mailto:info@mudric.com">
              info@mudric.com
            </a>.
          </p>

          <h2 className="text-xl font-bold dark:text-white">8) International Transfers</h2>
          <p>
            Data may be processed in countries other than your own. Where required, we use appropriate
            safeguards (e.g., SCCs) to protect personal data transferred internationally.
          </p>

          <h2 className="text-xl font-bold dark:text-white">9) Children’s Privacy</h2>
          <p>
            The Services are not directed to children under 13 (or 16 where applicable). We do not
            knowingly collect data from minors. If you believe a child has provided data, contact us to
            delete it.
          </p>

          <h2 className="text-xl font-bold dark:text-white text-red-600">10) No Financial Responsibility</h2>
          <p>
            Portivue provides information only. We accept <b>no responsibility for financial losses,
              trading decisions, errors, delays, data inaccuracies, or reliance on the Services</b>, except
            where prohibited by law.
          </p>

          <h2 className="text-xl font-bold dark:text-white">11) Changes to this Policy</h2>
          <p>
            We may update this Privacy Policy periodically. Material changes will be posted here and
            are effective upon posting unless stated otherwise.
          </p>

          <h2 className="text-xl font-bold dark:text-white">12) Contact</h2>
          <p>
            Questions or requests:{" "}
            <a className="text-emerald-600 underline" href="mailto:info@mudric.com">
              info@mudric.com
            </a>
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}