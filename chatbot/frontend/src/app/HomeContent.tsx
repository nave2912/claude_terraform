"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Boxes, Calculator, LockIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LoginDialog } from "@/features/auth/components/LoginDialog";

const SECTIONS = [
  {
    href: "/infra",
    icon: Boxes,
    title: "Infrastructure Management",
    description:
      "Chat with the Terraform landing zone to propose, review, and merge new Azure infrastructure via PR.",
  },
  {
    href: "/observability",
    icon: Activity,
    title: "Observability",
    description: "Track Azure cost and resource activity across the landing zone.",
  },
] as const;

// Unlike SECTIONS, this tool needs no login — it's a static calculator with
// no access to landing zone resources, so it links straight out instead of
// going through the LoginDialog/proxy.ts gate.
const OPEN_TOOLS = [
  {
    href: "https://amzn-639793187640-eu-north-1-an.s3.eu-north-1.amazonaws.com/cidr-calculator.html",
    icon: Calculator,
    title: "CIDR Calculator",
    description: "Work out subnet ranges and host counts for a CIDR block.",
  },
] as const;

/**
 * Both workspace cards always render locked here — there's no ongoing
 * "signed in" state to reflect (see proxy.ts: a login only ever unlocks
 * one workspace for one page load, never remembered past that). Signing
 * into one never shows the other as unlocked, and coming back to this
 * page — even via browser back, right after using the Infra login —
 * still shows both locked, on purpose.
 */
export function HomeContent() {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // A direct hit on /infra or /observability while logged out gets bounced
  // here by proxy.ts with ?login=1&next=<path> — reopen the dialog and
  // remember where they were headed so a successful login sends them
  // straight on, instead of dropping them back on this page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "1") {
      // window.location is only available post-mount (no SSR equivalent),
      // so this can't be derived during render — a one-time sync from the
      // URL on mount, not a case an effect-avoiding rewrite applies to.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoginOpen(true);
      setPendingHref(params.get("next"));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function openLogin(href: string) {
    setPendingHref(href);
    setLoginOpen(true);
  }

  function handleLoginSuccess() {
    if (pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
    }
  }

  const pendingSection = SECTIONS.find((s) => s.href === pendingHref);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <span className="text-sm font-semibold">Landing Zone Console</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
        <div className="max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight">What do you want to work on?</h1>
          <p className="mt-2 text-muted-foreground">Sign in to pick a workspace.</p>
        </div>

        <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-3">
          {SECTIONS.map((section) => (
            <button
              key={section.href}
              type="button"
              onClick={() => openLogin(section.href)}
              className="group text-left outline-none"
            >
              <Card className="h-full opacity-60 transition-all group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <section.icon className="size-5" />
                    </div>
                    <LockIcon className="size-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-3 text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    Sign in to open
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}

          {OPEN_TOOLS.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-left outline-none"
            >
              <Card className="h-full transition-all group-hover:border-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <tool.icon className="size-5" />
                  </div>
                  <CardTitle className="mt-3 text-lg">{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open tool
                  </span>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </main>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        target={pendingHref}
        targetLabel={pendingSection?.title}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
