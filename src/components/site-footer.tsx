import { Link } from "@tanstack/react-router";
import { SITE_EMAIL } from "@/lib/sa-jobs";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <h4 className="font-display font-bold">About SA Jobs</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            South Africa's dedicated vacancy portal. We manually curate opportunities from trusted
            employers nationwide to help you find your next career step.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Job Seekers
            </h4>
            <ul className="space-y-1 text-sm font-medium">
              <li>
                <Link to="/category/$slug" params={{ slug: "government-jobs" }}>
                  Government Jobs
                </Link>
              </li>
              <li>
                <Link to="/category/$slug" params={{ slug: "graduate-jobs" }}>
                  Graduates
                </Link>
              </li>
              <li>
                <Link to="/category/$slug" params={{ slug: "internships" }}>
                  Internships
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Employers
            </h4>
            <ul className="space-y-1 text-sm font-medium">
              <li>
                <Link to="/advertise">Advertise a Vacancy</Link>
              </li>
              <li>
                <Link to="/contact">Contact Us</Link>
              </li>
              <li>
                <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} SA Jobs. Not affiliated with the South African government.
            SA Jobs never charges applicants. Applicants are advised to verify vacancies before
            sharing sensitive information.
          </p>
        </div>
      </div>
    </footer>
  );
}
