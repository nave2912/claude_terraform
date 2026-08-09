import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ArrowRight, Boxes } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata: Metadata = {
  title: "Landing Zone Console",
  description: "Manage Azure infrastructure and observability for the landing zone.",
};

const SECTIONS = [
  {
    href: "/infra",
    icon: Boxes,
    title: "Infrastructure Management",
    description:
      "Chat with the Terraform landing zone to propose, review, and merge new Azure infrastructure via PR.",
    status: null,
  },
  {
    href: "/observability",
    icon: Activity,
    title: "Observability",
    description: "Track Azure cost and resource activity across the landing zone.",
    status: null,
  },
] as const;

export default function Home() {
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
          <p className="mt-2 text-muted-foreground">Pick a workspace to get started.</p>
        </div>

        <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="group outline-none">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:ring-primary/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <section.icon className="size-5" />
                    </div>
                    {section.status && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {section.status}
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-3 text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
