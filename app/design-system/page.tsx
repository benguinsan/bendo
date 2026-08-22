import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Swatch, type SwatchItem } from "@/app/design-system/swatch";
import { ThemePreviewToggle } from "@/app/design-system/theme-preview-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Design system · bendo",
};

const brandSwatches: SwatchItem[] = [
  { name: "Background", token: "bg-background", className: "bg-background" },
  {
    name: "Foreground",
    token: "text-foreground",
    className: "text-foreground",
    preview: "text" as const,
  },
  { name: "Primary", token: "bg-primary", className: "bg-primary" },
  {
    name: "Primary foreground",
    token: "bg-primary-foreground",
    className: "bg-primary-foreground",
  },
  { name: "Accent", token: "bg-accent", className: "bg-accent" },
  { name: "Secondary", token: "bg-secondary", className: "bg-secondary" },
  { name: "Muted", token: "bg-muted", className: "bg-muted" },
  { name: "Card", token: "bg-card", className: "bg-card" },
  { name: "Destructive", token: "bg-destructive", className: "bg-destructive" },
  { name: "Border", token: "bg-border", className: "bg-border" },
  { name: "Input", token: "bg-input", className: "bg-input" },
  { name: "Ring", token: "bg-ring", className: "bg-ring" },
  {
    name: "Body",
    token: "text-body",
    className: "text-body",
    preview: "text" as const,
  },
];

const sidebarSwatches: SwatchItem[] = [
  { name: "Sidebar", token: "bg-sidebar", className: "bg-sidebar" },
  {
    name: "Sidebar foreground",
    token: "text-sidebar-foreground",
    className: "text-sidebar-foreground",
    preview: "text" as const,
    sampleClassName: "bg-sidebar",
  },
  {
    name: "Sidebar accent",
    token: "bg-sidebar-accent",
    className: "bg-sidebar-accent",
  },
  {
    name: "Sidebar accent foreground",
    token: "text-sidebar-accent-foreground",
    className: "text-sidebar-accent-foreground",
    preview: "text" as const,
  },
];

const statusSwatches: SwatchItem[] = [
  {
    name: "Not started",
    token: "bg-status-not-started",
    className: "bg-status-not-started",
  },
  {
    name: "In progress",
    token: "bg-status-in-progress",
    className: "bg-status-in-progress",
  },
  {
    name: "Completed",
    token: "bg-status-completed",
    className: "bg-status-completed",
  },
  {
    name: "Priority moderate",
    token: "bg-priority-moderate",
    className: "bg-priority-moderate",
  },
  {
    name: "Date accent",
    token: "bg-date-accent",
    className: "bg-date-accent",
  },
  { name: "Chart 1", token: "bg-chart-1", className: "bg-chart-1" },
  { name: "Chart 2", token: "bg-chart-2", className: "bg-chart-2" },
  { name: "Chart 3", token: "bg-chart-3", className: "bg-chart-3" },
  { name: "Chart 4", token: "bg-chart-4", className: "bg-chart-4" },
  { name: "Chart 5", token: "bg-chart-5", className: "bg-chart-5" },
];

const radiusSpecimens = [
  { label: "rounded-sm", className: "rounded-sm" },
  { label: "rounded-lg", className: "rounded-lg" },
  { label: "rounded-card", className: "rounded-card" },
  { label: "rounded-full", className: "rounded-full" },
];

const shadowSpecimens = [
  { name: "Header", token: "shadow-header", className: "shadow-header" },
  { name: "Sidebar", token: "shadow-sidebar", className: "shadow-sidebar" },
  { name: "Panel", token: "shadow-panel", className: "shadow-panel" },
];

const buttonSpecimens = [
  { variant: "default" as const, label: "Default" },
  { variant: "outline" as const, label: "Outline" },
  { variant: "secondary" as const, label: "Secondary" },
  { variant: "ghost" as const, label: "Ghost" },
  { variant: "destructive" as const, label: "Destructive" },
  { variant: "link" as const, label: "Link" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-primary text-[15px] font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Specimen({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card bg-card shadow-panel border p-6">
      {children}
    </div>
  );
}

function SwatchGrid({ items }: { items: SwatchItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Swatch key={item.token} {...item} />
      ))}
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="bg-background text-foreground flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <Link href="/" className="text-primary cursor-pointer text-sm">
              Home
            </Link>
            <h1 className="text-[36px] leading-normal font-medium">
              <span className="text-primary">Design</span> system
            </h1>
            <p className="text-body text-sm">
              Token specimens from the Figma to-do list file.
            </p>
          </div>
          <ThemePreviewToggle />
        </header>

        <Section title="Brand & surfaces">
          <Specimen>
            <SwatchGrid items={brandSwatches} />
          </Specimen>
        </Section>

        <Section title="Sidebar">
          <Specimen>
            <div className="flex flex-col gap-6">
              <SwatchGrid items={sidebarSwatches} />
              <div className="bg-sidebar text-sidebar-foreground flex max-w-[288px] flex-col gap-2 rounded-lg p-4">
                <div className="rounded-card flex h-[59px] items-center px-4 text-base font-medium">
                  Vital Task
                </div>
                <div className="rounded-card bg-sidebar-accent text-sidebar-accent-foreground flex h-[59px] items-center px-4 text-base font-medium">
                  Dashboard
                </div>
              </div>
            </div>
          </Specimen>
        </Section>

        <Section title="Status & charts">
          <Specimen>
            <SwatchGrid items={statusSwatches} />
          </Specimen>
        </Section>

        <Section title="Typography">
          <Specimen>
            <div className="flex flex-col gap-4">
              <p className="text-[36px] leading-normal font-medium">
                Welcome back, Sundar
              </p>
              <p className="text-[32px] leading-normal font-semibold">
                <span className="text-primary">Dash</span>board
              </p>
              <p className="text-base leading-normal font-medium">Dashboard</p>
              <p className="text-base leading-normal font-semibold">
                Attend Nischal’s Birthday Party
              </p>
              <p className="text-body text-sm leading-normal">
                Buy gifts on the way and pick up cake from the bakery.
              </p>
              <p className="text-muted-foreground text-xs leading-normal">
                Created on: 20/06/2023
              </p>
              <div className="flex flex-wrap gap-4 text-[10px] leading-normal">
                <span className="text-status-not-started">Not Started</span>
                <span className="text-status-in-progress">In Progress</span>
                <span className="text-status-completed">Completed</span>
                <span className="text-priority-moderate">Moderate</span>
                <span className="text-date-accent">20/06/2023</span>
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-heading text-[36px] leading-normal font-bold">
                  Sign In
                </p>
                <p className="font-heading text-muted-foreground text-base leading-normal font-medium">
                  Enter Username
                </p>
              </div>
            </div>
          </Specimen>
        </Section>

        <Section title="Radius">
          <Specimen>
            <div className="flex flex-wrap gap-6">
              {radiusSpecimens.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={cn("bg-primary size-16", item.className)} />
                  <p className="text-muted-foreground text-xs">{item.label}</p>
                </div>
              ))}
            </div>
          </Specimen>
        </Section>

        <Section title="Shadows">
          <div className="grid gap-4 sm:grid-cols-3">
            {shadowSpecimens.map((item) => (
              <div
                key={item.token}
                className={cn(
                  "rounded-card bg-card border p-6",
                  item.className
                )}
              >
                <p className="text-foreground text-sm">{item.name}</p>
                <p className="text-muted-foreground text-xs">{item.token}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <Specimen>
            <div className="flex flex-wrap gap-2">
              {buttonSpecimens.map((item) => (
                <Button key={item.variant} variant={item.variant}>
                  {item.label}
                </Button>
              ))}
            </div>
          </Specimen>
        </Section>
      </main>
    </div>
  );
}
