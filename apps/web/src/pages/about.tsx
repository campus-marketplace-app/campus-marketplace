import { Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

export default function About() {
	const { schoolName, radiusId } = useTheme();
	const isPill = radiusId === "pill";

	return (
		<section className="bg-[var(--color-background)] px-4 py-8 sm:px-6 sm:py-10">
			<div className="mx-auto max-w-[760px] rounded-xl border border-black/10 bg-[var(--color-background)] p-4 shadow-lg sm:p-5">
				<div className="space-y-4 rounded-lg border border-black/10 bg-[var(--color-background)] p-4 sm:p-5">
					<header>
						<h1 className="text-center text-3xl font-bold text-[var(--color-text)]">About {schoolName} Marketplace</h1>
						<p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
							Campus Marketplace is a place for students to buy, sell, and share items or services within their school community. It helps students connect with each other for things like textbooks, furniture, electronics, tutoring, and more.
						</p>
					</header>

					<div>
						<h2 className="text-2xl font-semibold text-[var(--color-text)]">How it works</h2>
						<p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
							Students can create listings for items or services, browse what others have posted, and message each other directly through the platform. The goal is to make campus buying and selling simple, organized, and easy to use.
						</p>
					</div>

					<div className="rounded-lg border border-black/5 bg-[var(--color-surface)] p-3">
						<div className={isPill ? "pl-2 sm:pl-3" : undefined}>
							<h2 className="text-2xl font-semibold text-[var(--color-text)]">What you can find</h2>
							<ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
								<li className="flex items-center gap-2">
									<span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold leading-none text-[var(--color-text-on-primary)]">✓</span>
									<span>School supplies and textbooks</span>
								</li>
								<li className="flex items-center gap-2">
									<span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold leading-none text-[var(--color-text-on-primary)]">✓</span>
									<span>Furniture, electronics, and clothing</span>
								</li>
								<li className="flex items-center gap-2">
									<span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold leading-none text-[var(--color-text-on-primary)]">✓</span>
									<span>Student services such as tutoring or campus help</span>
								</li>
							</ul>
						</div>
					</div>

					<div className="rounded-lg border p-3" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 25%, #fff8dc)', borderColor: 'color-mix(in srgb, var(--color-primary) 16%, #d9c47f)' }}>
						<div className={isPill ? "pl-2 sm:pl-3" : undefined}>
							<h2 className="text-2xl font-semibold text-[var(--color-text)]">More information</h2>
							<p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
								This platform is meant to support the campus community by making it easier for students to connect and exchange useful resources. Always use good judgment when meeting others and follow your school's safety guidelines.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
						<Link
							to="/"
							className="rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--color-text-on-primary)] transition hover:opacity-90"
						>
							Browse Listings
						</Link>
						<Link
							to="/signup"
							className="rounded-md border border-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/5"
						>
							Sign Up
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
