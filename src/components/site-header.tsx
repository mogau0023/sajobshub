import { Link } from "@tanstack/react-router";
import { useState } from "react";
import logo1 from "@/assets/logo.png";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Browse Jobs" },
  { to: "/categories", label: "Categories" },
  { to: "/provinces", label: "Provinces" },
  { to: "/about", label: "About" },
  { to: "/advertise", label: "Advertise a Vacancy" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy px-4 py-3 shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="flex flex-col" onClick={() => setOpen(false)}>
          <img
            src={logo1}
            alt="Sajobshub logo"
            loading="lazy"
            className="h-12 w-auto object-contain"
          />
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-primary-foreground/80 transition-colors hover:text-gold"
              activeProps={{ className: "text-gold" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex flex-col gap-1">
            <div className="h-0.5 w-6 bg-primary-foreground" />
            <div className="h-0.5 w-6 bg-primary-foreground" />
            <div className="ml-auto h-0.5 w-4 bg-primary-foreground" />
          </div>
        </button>
      </div>

      {open && (
        <nav className="mx-auto mt-3 flex max-w-5xl flex-col gap-1 border-t border-navy-soft pt-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-primary-foreground/85"
              activeProps={{ className: "text-gold" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
