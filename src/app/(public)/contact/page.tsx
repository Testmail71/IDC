import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";

import { cacheSettings } from "@/lib/settings-cache";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const settings = await cacheSettings();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-600">
        Get in touch
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900">Contact Us</h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        For questions about registration, the course, payments or certificates, please
        reach out to the {settings.templeName} IDC department.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <ContactCard
          icon={<MapPin className="h-5 w-5" />}
          title="Visit"
          value={settings.contactAddress || settings.templeName}
        />
        <ContactCard
          icon={<Phone className="h-5 w-5" />}
          title="Call"
          value={settings.contactPhone || "—"}
          href={
            settings.contactPhone && /\d/.test(settings.contactPhone)
              ? `tel:${settings.contactPhone.replace(/\s+/g, "")}`
              : undefined
          }
        />
        <ContactCard
          icon={<Mail className="h-5 w-5" />}
          title="Email"
          value={settings.contactEmail || "—"}
          href={settings.contactEmail ? `mailto:${settings.contactEmail}` : undefined}
        />
      </div>

      {settings.centerName && (
        <div className="mt-10 rounded-xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="font-semibold text-stone-900">Department</h2>
          <p className="mt-1 text-sm text-stone-600">{settings.centerName}</p>
        </div>
      )}

      <div className="mt-10 rounded-xl border border-gold-200 bg-gold-100/40 p-6 text-sm text-stone-700">
        <p className="font-semibold text-maroon-900">Note on payments</p>
        <p className="mt-1.5">
          Course fees are collected by the temple through authorised channels only. Always
          insist on a receipt — verified payments are recorded in your portal account and a
          PDF receipt becomes available for download.
        </p>
      </div>
    </div>
  );
}

function ContactCard({
  icon,
  title,
  value,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-saffron-50 text-saffron-600">
        {icon}
      </span>
      <h3 className="mt-3 font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{value}</p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
      >
        {content}
      </a>
    );
  }
  return <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">{content}</div>;
}