import Link from "next/link";
import type { MatchStatus, RoundStatus } from "@prisma/client";
import { attendanceLabel, matchStatusLabel, roundStatusLabel, signed } from "@/lib/labels";
import { HeaderArt, EmptyArt } from "./art";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr"))
    .join("");
}

export function Avatar({ name, photoUrl, size = "md" }: { name: string; photoUrl?: string | null; size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" }) {
  const s = { xs: "h-6 w-6 text-[9px]", sm: "h-7 w-7 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-14 w-14 text-base", xl: "h-20 w-20 text-2xl", "2xl": "h-28 w-28 text-3xl" }[size];
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} className={`${s} inline-block shrink-0 rounded-full object-cover align-middle ring-2 ring-white`} />;
  }
  return (
    <span className={`${s} inline-grid shrink-0 place-items-center rounded-full bg-table-100 align-middle font-bold text-table-700 ring-2 ring-white`} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function MatchStatusChip({ status }: { status: MatchStatus }) {
  const cls = {
    PENDING: "bg-table-50 text-table-700",
    SUBMITTED: "bg-amber-50 text-amber-700",
    DISPUTED: "bg-rubber-500/10 text-rubber-600",
    APPROVED: "bg-emerald-50 text-emerald-700",
  }[status];
  return <span className={`chip ${cls}`}>{matchStatusLabel[status]}</span>;
}

export function RoundStatusChip({ status }: { status: RoundStatus }) {
  const cls = { DRAFT: "bg-line text-ink-soft", ATTENDANCE: "bg-amber-50 text-amber-700", OPEN: "bg-ball-500 text-white", CLOSED: "bg-emerald-50 text-emerald-700" }[status];
  return <span className={`chip ${cls}`}>{roundStatusLabel[status]}</span>;
}

/** +12 yeşil, -8 kırmızı */
export function Delta({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span className={`text-ink-soft ${className}`}>–</span>;
  const cls = value > 0 ? "text-emerald-600" : value < 0 ? "text-rubber-600" : "text-ink-soft";
  return <span className={`font-semibold tabular-nums ${cls} ${className}`}>{signed(value)}</span>;
}

export function PlayerLink({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  return (
    <Link href={`/oyuncular/${id}`} className={`font-semibold hover:text-table-600 ${className}`}>
      {name}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
  photo,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  photo?: React.ReactNode;
}) {
  return (
    <section className="cosmos relative overflow-hidden text-white">
      <div className="relative mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 pt-10 pb-12 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          {photo && <div className="hidden shrink-0 sm:block">{photo}</div>}
          <div className="min-w-0">
          {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-ball-300 uppercase">{eyebrow}</p>}
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {subtitle && <div className="mt-2 max-w-2xl text-table-100">{subtitle}</div>}
          {children && <div className="mt-5">{children}</div>}
          </div>
        </div>
        <HeaderArt className="hidden h-28 w-56 shrink-0 md:block" />
      </div>
    </section>
  );
}

export function SectionTitle({ title, href, linkText = "Tümü" }: { title: string; href?: string; linkText?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2.5 text-xl font-bold">
        <span className="h-5 w-1 rounded-sm bg-ball-500" />
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-table-600 hover:text-table-800">
          {linkText} →
        </Link>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <EmptyArt />
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: React.ReactNode }) {
  const cls = {
    info: "border-table-200 bg-table-50 text-table-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rubber-500/30 bg-rubber-500/5 text-rubber-600",
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function AttendanceChip({ value }: { value: "PENDING" | "YES" | "NO" | "AUTO_NO" }) {
  const cls = { PENDING: "bg-line text-ink-soft", YES: "bg-emerald-50 text-emerald-700", NO: "bg-rubber-500/10 text-rubber-600", AUTO_NO: "bg-rubber-500 text-white" }[value];
  return <span className={`chip ${cls}`}>{attendanceLabel[value]}</span>;
}
