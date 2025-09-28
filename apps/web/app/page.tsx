import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Formsmith — Open-source Notion-style Form Builder",
  description:
    "Create powerful forms with a Notion-like editor. Open-source, MIT licensed, and built with Next.js.",
  openGraph: {
    title: "Formsmith — Open-source Notion-style Form Builder",
    description:
      "Create powerful forms with a Notion-like editor. Open-source, MIT licensed, and built with Next.js.",
    url: "https://formsmith.app",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "/app";
const GITHUB_URL = "https://github.com/SammitBadodekar/formsmith";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Subtle background decorations */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-fuchsia-500/20 via-purple-500/20 to-indigo-500/20 blur-3xl" />
        <div className="mx-auto h-full w-full bg-[radial-gradient(transparent_1px,rgba(0,0,0,0.02)_1px)] [background-size:16px_16px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-semibold tracking-tight">Formsmith</span>
            <span className="ml-2 rounded-full border px-2 py-0.5 text-xs">
              Open-source
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm hover:underline">
              Features
            </a>
            <a href="#editor" className="text-sm hover:underline">
              Editor
            </a>
            {/* <a href="#integrations" className="text-sm hover:underline">
              Integrations
            </a> */}
            <a href="#oss" className="text-sm hover:underline">
              Open Source
            </a>
            <Link
              href={GITHUB_URL}
              target="_blank"
              className="text-sm hover:underline"
            >
              GitHub
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href={GITHUB_URL}>⭐ Star on GitHub</Link>
            </Button>
            <Button asChild>
              <Link href={APP_URL}>Go to App</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Notion-style blocks • MIT Licensed
          </span>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-6xl">
            The simplest way to{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
              create forms
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground sm:text-lg">
            Formsmith is an open-source, Tally-inspired form builder. Craft
            forms with a familiar Notion-like editor, add logic, collect
            responses, and connect your favorite tools — all in minutes.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={APP_URL}>Start building — it’s free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={GITHUB_URL}>View repository</Link>
            </Button>
          </div>

          {/* “Fake” product window so you don't need assets */}
          <div className="mx-auto mt-12 w-full max-w-4xl rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-3">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-muted-foreground">
                /new-form
              </span>
            </div>
            <div className="grid gap-4 p-3 md:grid-cols-[1fr,340px]">
              <div className="space-y-3">
                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 font-medium">Register now</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Name"
                    />
                    <input
                      className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Email"
                      type="email"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border"
                      id="agree"
                    />
                    <label
                      htmlFor="agree"
                      className="text-xs text-muted-foreground"
                    >
                      I agree to the terms
                    </label>
                  </div>
                  <div className="mt-3">
                    <Button className="w-full sm:w-auto">Submit</Button>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
                  Type <code className="rounded bg-muted px-1">/</code> to
                  insert blocks: heading, text, input, select, date, file,
                  divider, embed, …<br />
                  Use <code className="rounded bg-muted px-1">
                    cmd/ctrl
                  </code> + <code className="rounded bg-muted px-1">K</code> to
                  quick search.
                </div>
              </div>

              <aside className="space-y-3 rounded-md border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Form settings</span>
                  <Gear className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2 text-sm">
                  <ToggleRow label="Collect emails" on />
                  <ToggleRow label="One response per user" />
                  <ToggleRow label="Show progress bar" on />
                </div>
                <div className="mt-4 rounded-md border bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-medium">Logic</p>
                  <p className="text-xs text-muted-foreground">
                    If <strong>agree</strong> is unchecked → show{" "}
                    <em>“Please accept terms.”</em>
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Simple, but{" "}
          <span className="underline decoration-indigo-500/60">powerful</span>
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<Cursor className="h-5 w-5" />}
            title="Notion-like editing"
            desc="Type / to insert blocks, drag to reorder, and stay in the flow."
          />
          <Feature
            icon={<Bolt className="h-5 w-5" />}
            title="Conditional logic"
            desc="Show/hide, branch, and validate — no code required."
          />
          <Feature
            icon={<Puzzle className="h-5 w-5" />}
            title="Embeds & rich inputs"
            desc="File uploads, signatures, ratings, and embeds right in your form."
          />
          <Feature
            icon={<LinkIcon className="h-5 w-5" />}
            title="Share & embed"
            desc="Public links, custom domains, or drop it in an iframe."
          />
          <Feature
            icon={<Chart className="h-5 w-5" />}
            title="Responses dashboard"
            desc="Filter, export CSV, or sync to your data warehouse."
          />
          <Feature
            icon={<Shield className="h-5 w-5" />}
            title="Privacy first"
            desc="Own your data. Self-host or use the hosted cloud."
          />
        </div>
      </section>

      {/* Editor deep dive */}
      <section id="editor" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-2xl font-semibold">Craft intelligent forms</h3>
            <p className="mt-3 text-muted-foreground">
              Validate fields, branch to different pages, and calculate scores.
              Build surveys, applications, RSVPs, onboarding flows and more —
              all with a clean, distraction-free editor.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>• Page logic and progress</li>
              <li>• Required fields & regex validation</li>
              <li>• Hidden fields & UTM capture</li>
              <li>• Thank-you pages & redirects</li>
            </ul>

            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link href={APP_URL}>Create a form</Link>
              </Button>
              {/* <Button variant="outline" asChild>
                <Link href="#integrations">See integrations</Link>
              </Button> */}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium">Live preview</div>
            <div className="space-y-3">
              <PreviewRow label="What’s your role?">
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option>Developer</option>
                  <option>Designer</option>
                  <option>Product</option>
                </select>
              </PreviewRow>
              <PreviewRow label="Pick a date">
                <input
                  type="date"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </PreviewRow>
              <PreviewRow label="Upload a file">
                <input
                  type="file"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </PreviewRow>
              <PreviewRow label="Rate your experience">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} aria-hidden className="select-none text-xl">
                      ★
                    </span>
                  ))}
                </div>
              </PreviewRow>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      {/* <section id="integrations" className="mx-auto max-w-6xl px-4 py-20">
        <h3 className="text-center text-3xl font-bold tracking-tight">
          Connect your favorite tools
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Send responses to webhooks, Slack, Notion, Google Sheets, or your own
          database. Use our simple API to pull results into anything.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            "Webhooks",
            "Slack",
            "Notion",
            "Google Sheets",
            "Postgres",
            "Zapier",
          ].map((name) => (
            <div
              key={name}
              className="flex items-center justify-center rounded-lg border bg-muted/30 p-4 text-sm"
            >
              {name}
            </div>
          ))}
        </div>
      </section> */}

      {/* Open source / CTA */}
      <section
        id="oss"
        className="mx-auto max-w-6xl rounded-xl border bg-muted/30 px-4 py-16 sm:px-8"
      >
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-2xl font-semibold">100% open-source</h3>
            <p className="mt-3 text-muted-foreground">
              Formsmith is MIT licensed and built in the open. Fork it,
              self-host it, or contribute features and docs. Your feedback
              shapes the roadmap.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link href={GITHUB_URL}>Contribute on GitHub</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={APP_URL}>Try the demo</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <Image
                src="/favicon.ico"
                alt="Formsmith"
                width={24}
                height={24}
                className="rounded"
              />
              <div>
                <p className="text-sm font-medium">
                  SammitBadodekar / formsmith
                </p>
                <p className="text-xs text-muted-foreground">
                  Next.js • TypeScript • Tailwind • Shadcn UI
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label="Stars" value="★ ★ ★" />
              <Stat label="Issues" value="Good first" />
              <Stat label="License" value="MIT" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              P.S. replace these placeholders with live GitHub data when you’re
              ready.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Formsmith. Built with ❤️ & open
            source.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link className="hover:underline" href={GITHUB_URL}>
              GitHub
            </Link>
            <a className="hover:underline" href="#features">
              Features
            </a>
            {/* <a className="hover:underline" href="#integrations">
              Integrations
            </a> */}
            <Link className="hover:underline" href={APP_URL}>
              Go to App
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- small dumb UI bits (no extra deps) ---------- */

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-accent/30">
      <div className="flex items-center gap-3">
        <div className="rounded-md border bg-background p-2">{icon}</div>
        <h4 className="font-medium">{title}</h4>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function ToggleRow({ label, on = false }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
      <span className="text-xs">{label}</span>
      <div
        className={[
          "h-5 w-9 rounded-full border transition-colors",
          on ? "bg-indigo-600" : "bg-muted",
        ].join(" ")}
        aria-label={label}
      >
        <div
          className={[
            "h-5 w-5 rounded-full border bg-background transition-transform",
            on ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/* ---------- tiny inline icons so you don't need lucide ---------- */
function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v9A3.5 3.5 0 0 1 16.5 20h-9A3.5 3.5 0 0 1 4 16.5v-9Z"
        className="fill-current"
        opacity="0.1"
      />
      <path
        d="M7.5 8h9M7.5 12h6M7.5 16h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Sparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3Z"
        stroke="currentColor"
      />
      <path
        d="M6 15l.8 1.8L9 17l-1.8.8L6 19.5l-.8-1.7L3.5 17l1.7-.3L6 15Z"
        stroke="currentColor"
      />
      <circle cx="18.5" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}
function Gear(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M19 12a7 7 0 0 0-.1-1l2.1-1.5-2-3.4-2.4.7a7 7 0 0 0-1.7-1L14.5 2h-5l-.4 2.8a7 7 0 0 0-1.7 1l-2.4-.7-2 3.4L4.1 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.4 2.4-.7c.5.4 1.1.8 1.7 1l.4 2.8h5l.4-2.8c.6-.2 1.2-.6 1.7-1l2.4.7 2-3.4L18.9 13c.1-.3.1-.7.1-1Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
function Cursor(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5 3l13 7-6 2-2 6-5-15Z" />
    </svg>
  );
}
function Bolt(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}
function Puzzle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 3h5v3a2 2 0 1 0 0 4v3H7V3Zm10 8h4v10H11v-4a2 2 0 1 1 0-4h3v-2a2 2 0 1 0 3 0v0Z" />
    </svg>
  );
}
function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-1 1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l1-1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function Chart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 20V6m5 14V4m5 16V10m5 10V13"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3 4 6v6c0 5 3.6 7.7 8 9 4.4-1.3 8-4 8-9V6l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
