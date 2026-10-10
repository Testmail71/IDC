import type { Metadata } from "next";
import { BookOpen, GraduationCap, HeartHandshake, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "About the Course" };

const OUTLINE = [
  "The importance of accepting a spiritual master",
  "Srila Prabhupada as the founder-acarya of ISKCON",
  "The qualifications of a disciple and of a guru",
  "Initiation within ISKCON: process and expectations",
  "Relationship with the spiritual master after initiation",
  "Serving the spiritual master and the mission",
  "Avoiding offences and maintaining discipline",
  "Studying Srila Prabhupada's books systematically",
  "The role of the temple and the community",
  "Sadhana, regulative principles and vows",
  "Handling challenges and doubts with maturity",
  "Preparing for lifelong Krsna conscious practice",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-600">
        About IDC
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900">
        About the ISKCON Disciples Course
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-stone-600">
        The ISKCON Disciples Course (IDC) is a structured study programme designed for
        devotees who wish to understand the principles of the guru-disciple relationship
        and the process of initiation within ISKCON, as presented by Srila Prabhupada
        and the ISKCON Governing Body Commission.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          {
            icon: BookOpen,
            title: "Grounded in shastra",
            text: "Based on Srila Prabhupada's books and the GBC's directions on initiation.",
          },
          {
            icon: GraduationCap,
            title: "Taught in the temple",
            text: "Organised locally by the IDC department with dedicated teachers.",
          },
          {
            icon: HeartHandshake,
            title: "Personal guidance",
            text: "Students are supported throughout by their assigned teacher.",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <c.icon className="h-6 w-6 text-saffron-600" />
            <h3 className="mt-3 font-semibold text-stone-900">{c.title}</h3>
            <p className="mt-1.5 text-sm text-stone-500">{c.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-stone-900">
            <Sparkles className="h-5 w-5 text-gold-500" />
            Course outline
          </h2>
          <p className="mt-3 text-stone-600">
            The course comprises twelve classes. Each class is followed by discussion,
            so students can clarify their understanding before moving on.
          </p>
          <ol className="mt-6 space-y-2">
            {OUTLINE.map((item, i) => (
              <li key={item} className="flex items-start gap-3 rounded-lg border border-stone-100 bg-white px-4 py-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-xs font-bold text-saffron-700">
                  {i + 1}
                </span>
                <span className="text-sm text-stone-700">{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-6">
            <h3 className="text-lg font-semibold text-stone-900">Who should join?</h3>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li>• Devotees aspiring towards initiation</li>
              <li>• Serious practitioners deepening their knowledge</li>
              <li>• Newer devotees seeking a clear foundation</li>
              <li>• Anyone recommended by the temple authorities</li>
            </ul>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-6">
            <h3 className="text-lg font-semibold text-stone-900">Examination & certificate</h3>
            <p className="mt-3 text-sm text-stone-600">
              After completing the classes you may take a written examination. On
              qualifying, the IDC administrator issues a certificate bearing a unique
              serial number that can be verified publicly.
            </p>
          </div>
          <div className="rounded-xl border border-gold-200 bg-gold-100/50 p-6">
            <h3 className="text-lg font-semibold text-maroon-900">Ready to begin?</h3>
            <p className="mt-2 text-sm text-stone-600">
              Registration takes only a few minutes.
            </p>
            <div className="mt-4">
              <Button href="/register" variant="maroon">
                Register as a student
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}