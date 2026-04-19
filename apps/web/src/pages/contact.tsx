import { Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

export default function Contact() {
	const { schoolName, radiusId } = useTheme();
	const isPill = radiusId === "pill";

	return (
		<section className="bg-[var(--color-secondary)] px-4 py-8 sm:px-6 sm:py-10">
			<div
				className="mx-auto max-w-[760px] rounded-xl border bg-[var(--color-secondary)] p-5 shadow-lg sm:p-6"
				style={{ borderColor: "var(--color-border)" }}
			>
				<h1 className="text-center text-3xl font-bold text-[var(--color-text)]">Contact {schoolName} Marketplace</h1>
				<p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
					If you have questions, feedback, or need help with the platform, you can reach out using the contact information below.
				</p>

				<div
					className="mt-5 rounded-[var(--radius)] border p-4"
					style={{
						borderColor: "var(--color-border)",
						backgroundColor: "var(--color-surface)",
					}}
				>
				<div className={isPill ? "text-center px-3 sm:px-5" : undefined}>
						<h2 className="text-2xl font-semibold text-[var(--color-text)]">What to include</h2>
						<ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
						<li className="flex items-center gap-2">
							<span className="inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-primary)]" />
							<span>Your name and school email</span>
						</li>
						<li className="flex items-center gap-2">
							<span className="inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-primary)]" />
							<span>A short description of the issue or question</span>
						</li>
						<li className="flex items-center gap-2">
							<span className="inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-primary)]" />
							<span>Any relevant listing or account details</span>
						</li>
						</ul>
					</div>
				</div>

				<div className="mt-5 rounded-[var(--radius)] border bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] p-5 text-[var(--color-text-on-primary)] shadow-md" style={{ borderColor: "color-mix(in srgb, var(--color-primary-dark) 60%, var(--color-border))" }}>
					<div className="flex items-start gap-3">
						<div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] text-lg font-bold text-[var(--color-text-on-primary)]" style={{ backgroundColor: "color-mix(in srgb, var(--color-text-on-primary) 18%, transparent)" }}>
							@
						</div>
					<div className={isPill ? "text-center px-3 sm:px-5" : undefined}>
							<p className="text-3xl font-semibold leading-tight">Email support</p>
							<a
								href="mailto:support@campusmarketplace.edu"
								className="mt-1 inline-block text-lg underline underline-offset-4 transition hover:opacity-85"
								style={{ textDecorationColor: "color-mix(in srgb, var(--color-text-on-primary) 70%, transparent)" }}
							>
								support@campusmarketplace.edu
							</a>
							<p className="mt-2 text-sm text-[var(--color-text-on-primary)]/85">
								Use this placeholder email for now. You can swap it later with your real support address.
							</p>
						</div>
					</div>
				</div>

				<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Link
						to="/help"
						className="rounded-[var(--radius)] border bg-[var(--color-secondary)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-background)]"
						style={{ borderColor: "var(--color-border)" }}
					>
						View Help Center
					</Link>
					<Link
						to="/login"
						className="rounded-[var(--radius)] border bg-[var(--color-secondary)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-background)]"
						style={{ borderColor: "var(--color-border)" }}
					>
						Back to Login
					</Link>
				</div>
			</div>
		</section>
	);
}
