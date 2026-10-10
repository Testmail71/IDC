import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileBadge,
  IndianRupee,
  Lock,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { Faq } from "@/components/public/faq";
import { Button } from "@/components/ui/button";
import { cacheSettings } from "@/lib/settings-cache";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: UserPlus,
    title: "Register",
    text: "Create your student account with your details and a passport-style photo.",
  },
  {
    icon: ShieldCheck,
    title: "Admin Approval",
    text: "The IDC administrator reviews your application and confirms your enrollment.",
  },
  {
    icon: BookOpen,
    title: "Study & Fees",
    text: "Attend the classes, track your progress and clear the course fee in installments.",
  },
  {
    icon: ClipboardCheck,
    title: "Examination",
    text: "Submit your exam sheet once the course is completed and it is evaluated.",
  },
  {
    icon: FileBadge,
    title: "Certificate",
    text: "On qualification, download your signed certificate or share its verification link.",
  },
];

const FEATURES = [
  {
    icon: Users,
    title: "Student management",
    text: "Profiles, teachers, course progress and examination status in one place.",
  },
  {
    icon: IndianRupee,
    title: "Transparent payments",
    text: "Record cash, UPI or bank payments, track dues and download receipts.",
  },
  {
    icon: CalendarDays,
    title: "Course progress",
    text: "See exactly how many of the 12 classes you have completed.",
  },
  {
    icon: ClipboardCheck,
    title: "Examination workflow",
    text: "Structured submission and evaluation with clear result communication.",
  },
  {
    icon: FileBadge,
    title: "Verifiable certificates",
    text: "Each certificate carries a serial number and public verification page.",
  },
  {
    icon: Lock,
    title: "Secure records",
    text: "Role-based access keeps student and financial data protected.",
  },
];

const FAQS = [
  {
    q: "Who can join the ISKCON Disciples Course?",
    a: "Any devotee who wishes to deepen their understanding of the guru-disciple relationship and Srila Prabhupada's instructions is welcome to register. Approval is given by the local IDC administrator.",
  },
  {
    q: "How do I pay the course fee?",
    a: "Fees may be paid in cash, by UPI or by bank transfer to the temple. The administrator records each payment and provides a receipt, which you can download from your dashboard.",
  },
  {
    q: "When can I take the examination?",
    a: "You may submit your examination sheet after completing all the classes of the course. In special cases the administrator may allow earlier submission.",
  },
  {
    q: "How do I receive my certificate?",
    a: "Once you qualify in the examination, the administrator issues your certificate. You can then download it from your dashboard or share its verification link with others.",
  },
  {
    q: "Is my personal information safe?",
    a: "Yes. Your data is protected by role-based access controls. Only you and the authorised IDC staff can see your records.",
  },
];

export default async function HomePage() {
  const settings = await cacheSettings();

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {settings.templeName}
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              ISKCON <span className="text-gradient">Disciples Course</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-200">
              {settings.homepageIntro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register" size="lg" variant="gold" className="font-semibold">
                Register as a Student
              </Button>
              <Button
                href="/login"
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50"
              >
                Student Login
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-stone-300">
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gold-400" /> 12 structured classes
              </span>
              <span className="inline-flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-gold-400" /> Flexible fee installments
              </span>
              <span className="inline-flex items-center gap-2">
                <FileBadge className="h-4 w-4 text-gold-400" /> Verifiable certificate
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-decor border-b border-stone-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading
            eyebrow="How it works"
            title="From registration to certificate"
            subtitle="A clear, guided path so students always know the next step."
          />
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <span className="absolute -top-3 left-5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-maroon-800 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <step.icon className="h-7 w-7 text-saffron-600" />
                <h3 className="mt-3 text-sm font-semibold text-stone-900">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="What you get"
          title="Everything managed in one portal"
          subtitle="Designed for temple IDC departments that need accuracy without complexity."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-saffron-50 text-saffron-600">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-stone-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fee & payment transparency */}
      <section className="border-y border-stone-100 bg-stone-50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Fees & payments"
              title="Simple, transparent and receipted"
              subtitle="The course fee supports study materials, examinations and certification. Pay in easy installments as agreed with the administrator."
            />
            <ul className="mt-6 space-y-3 text-sm text-stone-600">
              {[
                "Pay by cash, UPI or bank transfer to the temple",
                "Partial payments are tracked accurately against your dues",
                "Every verified payment generates a downloadable PDF receipt",
                "Waivers, discounts and refunds are recorded with a full audit trail",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button href="/register" variant="maroon" size="lg">
                Start your registration
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Course at a glance
            </p>
            <dl className="mt-4 divide-y divide-stone-100">
              {[
                ["Classes", "12 structured sessions"],
                ["Assessment", "Written examination"],
                ["Fee", "Installments accepted"],
                ["Receipts", "PDF, downloadable"],
                ["Certificate", "Serialised & verifiable"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-3">
                  <dt className="text-sm text-stone-500">{k}</dt>
                  <dd className="text-sm font-semibold text-stone-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="Questions"
          title="Frequently asked questions"
          subtitle="Still unsure? Reach out via the contact page."
        />
        <div className="mt-10">
          <Faq items={FAQS} />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-maroon-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
          <h2 className="max-w-2xl text-3xl font-bold text-white">
            Begin your journey as a disciple
          </h2>
          <p className="max-w-xl text-stone-300">
            Register today and take the first step towards a deeper understanding of
            the guru-disciple relationship.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/register" size="lg" variant="gold">
              Register now
            </Button>
            <Button
              href="/verify"
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10"
            >
              Verify a certificate
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-600">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{title}</h2>
      {subtitle && <p className="mt-3 text-stone-500">{subtitle}</p>}
    </div>
  );
}