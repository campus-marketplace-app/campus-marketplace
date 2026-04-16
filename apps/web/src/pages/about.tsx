import { Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

export default function About() {
	const { schoolName } = useTheme();

	return (
		<section className="px-6 py-8 sm:px-8 sm:py-10">
			<div className="mx-auto max-w-3xl space-y-6">
				<header
					className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 shadow-sm"
					style={{ borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))" }}
				>
					<h1 className="text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
						About {schoolName} Marketplace
					</h1>
					<p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
						Campus Marketplace is a place for students to buy, sell, and share items or services within their school community.
						 It helps students connect with each other for things like textbooks, furniture, electronics, tutoring, and more.
					</p>
				</header>

				<div className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 shadow-sm" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))" }}>
					<h2 className="text-xl font-semibold text-[var(--color-text)]">How it works</h2>
					<p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
						Students can create listings for items or services, browse what others have posted, and message each other directly through the platform.
						 The goal is to make campus buying and selling simple, organized, and easy to use.
					</p>
				</div>

				<div className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 shadow-sm" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))" }}>
					<h2 className="text-xl font-semibold text-[var(--color-text)]">What you can find</h2>
					<ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--color-text-muted)]">
						<li>School supplies and textbooks</li>
						<li>Furniture, electronics, and clothing</li>
						<li>Student services such as tutoring or campus help</li>
					</ul>
				</div>

				<div className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 shadow-sm" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))" }}>
					<h2 className="text-xl font-semibold text-[var(--color-text)]">More information</h2>
					<p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
						This platform is meant to support the campus community by making it easier for students to connect and exchange useful resources.
						 Always use good judgment when meeting others and follow your school’s safety guidelines.
					</p>

					<div className="mt-5 flex flex-wrap gap-3">
						<Link
							to="/"
							className="rounded-[var(--radius)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] transition hover:opacity-90"
						>
							Browse Listings
						</Link>
						<Link
							to="/signup"
							className="rounded-[var(--radius)] border px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-background)]"
							style={{ borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))" }}
						>
							Sign Up
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
