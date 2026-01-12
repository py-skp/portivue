"use client";

// app/terms/page.tsx
import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout>
      <div className="mx-auto max-w-4xl px-6 leading-7 text-zinc-800 dark:text-slate-300">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight dark:text-white">Terms of Service</h1>
        <p className="text-sm text-zinc-500 dark:text-slate-500">Effective date: {new Date().toLocaleDateString()}</p>

        <section className="mt-8 space-y-6">
          <p>
            Welcome to <strong>Portivue by Mudric Labs</strong> (“Portivue”, “we”, “us”, or “our”).
            These Terms of Service (“Terms”) govern your access to and use of our websites,
            applications, APIs, and related services (collectively, the “Services”). By accessing or
            using the Services, you agree to be bound by these Terms. If you do not agree, do not use
            the Services.
          </p>

          <h2 className="text-xl font-bold dark:text-white">1) Eligibility</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You must be at least 18 years old and capable of forming a binding contract.</li>
            <li>
              If you use the Services on behalf of an entity, you represent that you have authority to
              bind that entity and that entity accepts these Terms.
            </li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white">2) Nature of Services (No Advice)</h2>
          <p>
            Portivue provides portfolio aggregation, analytics, and visualization tools. We are <b>not</b>{" "}
            a broker-dealer, investment adviser, or fiduciary. Information provided via the Services is
            for informational and educational purposes only and does <b>not</b> constitute investment,
            legal, tax, or accounting advice. You are solely responsible for your decisions.
          </p>

          <h2 className="text-xl font-bold dark:text-white">3) Accounts & Security</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You agree to provide accurate and current information.</li>
            <li>You are responsible for maintaining the confidentiality of your credentials.</li>
            <li>Notify us immediately of any unauthorized access or suspected breach.</li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white">4) User Content & Data</h2>
          <p>
            You retain ownership of the data you submit, including portfolio, positions, balances, and
            transactions (“User Data”). You grant Portivue a worldwide, non-exclusive, royalty-free
            license to host, process, display, and transmit User Data solely to provide and improve the
            Services, and to comply with law. Processing of User Data is described in our{" "}
            <a className="text-emerald-600 underline" href="/privacy">
              Privacy Policy
            </a>
            .
          </p>

          <h2 className="text-xl font-bold dark:text-white">5) Prohibited Use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Illegal, infringing, or fraudulent activities.</li>
            <li>Interfering with security or operation of the Services.</li>
            <li>Reverse-engineering, scraping, or exploiting the Services.</li>
            <li>Accessing data of others without authorization.</li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white">6) Subscriptions & Fees</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Some features may require a paid plan. Fees are shown at purchase.</li>
            <li>Unless required by law, payments are non-refundable.</li>
            <li>We may change pricing with reasonable advance notice.</li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white">7) Intellectual Property</h2>
          <p>
            The Services (including software, design, text, graphics, and trademarks) are owned by
            Portivue or its licensors and protected by applicable laws. No rights are granted except as
            expressly set forth in these Terms.
          </p>

          <h2 className="text-xl font-bold dark:text-white">8) Third-Party Services</h2>
          <p>
            The Services may integrate with third-party products (e.g., identity providers, analytics,
            market data). We do not control and are not responsible for third-party services. Your use
            of them is governed by their terms and policies.
          </p>

          <h2 className="text-xl font-bold dark:text-white text-red-600">9) Disclaimers</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT ANY WARRANTIES, EXPRESS OR
              IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR
              NON-INFRINGEMENT.
            </li>
            <li>
              WE DO NOT WARRANT THAT DATA (INCLUDING AGGREGATED ACCOUNT OR MARKET DATA) IS ACCURATE,
              COMPLETE, CURRENT, OR ERROR-FREE, OR THAT THE SERVICES WILL BE UNINTERRUPTED OR SECURE.
            </li>
            <li>
              PORTFOLIO AND MARKET INFORMATION IS VOLATILE AND MAY BE DELAYED OR INCORRECT. YOU BEAR
              ALL RISK FOR ANY RELIANCE.
            </li>
          </ul>

          <h2 className="text-xl font-bold dark:text-white text-red-600">10) Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PORTIVUE, ITS AFFILIATES, DIRECTORS, EMPLOYEES, AND
            SUPPLIERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY,
            OR PUNITIVE DAMAGES; LOST PROFITS; LOST DATA; BUSINESS INTERRUPTION; OR COST OF SUBSTITUTE
            SERVICES, EVEN IF ADVISED OF THE POSSIBILITY. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO
            THE SERVICES SHALL NOT EXCEED THE AMOUNT YOU PAID TO PORTIVUE IN THE 12 MONTHS PRECEDING THE
            CLAIM OR USD $100, WHICHEVER IS GREATER.
          </p>

          <h2 className="text-xl font-bold dark:text-white">11) Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Portivue from any claims, losses,
            liabilities, damages, costs, and expenses (including reasonable attorneys’ fees) arising
            from your use of the Services, User Data, or violation of these Terms or law.
          </p>

          <h2 className="text-xl font-bold dark:text-white">12) Suspension & Termination</h2>
          <p>
            We may suspend or terminate access immediately for any violation of these Terms, suspected
            fraud, or harm to the Services. You may stop using the Services at any time.
          </p>

          <h2 className="text-xl font-bold dark:text-white">13) Governing Law & Dispute Resolution</h2>
          <p>
            These Terms are governed by the laws of <em>the United Arab Emirates</em>, without
            regard to conflict-of-laws principles. Exclusive venue lies in the courts located in{" "}
            <em>Dubai</em>. You waive any objection to personal jurisdiction and venue.
          </p>

          <h2 className="text-xl font-bold dark:text-white">14) Changes to the Terms</h2>
          <p>
            We may update these Terms at any time. Material changes will be posted on this page and
            become effective upon posting unless stated otherwise. Continued use constitutes acceptance.
          </p>

          <h2 className="text-xl font-bold dark:text-white">15) Contact</h2>
          <p>
            Questions? <a className="text-emerald-600 underline" href="mailto:info@mudric.com">info@mudric.com</a>
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}