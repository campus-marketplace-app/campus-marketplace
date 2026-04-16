import { useTheme } from "../contexts/ThemeContext";

export default function Contact() {
	const { schoolName } = useTheme();

	return (
		<section className="px-6 py-8 sm:px-8 sm:py-10">
			<div className="mx-auto max-w-3xl space-y-6">
				<header
					className="rounded-[var(--radius-lg)] border p-6 shadow-sm sm:p-8"
					style={{
						borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))",
						background:
							"linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-background)), color-mix(in srgb, var(--color-secondary) 14%, var(--color-surface)))",
					}}
				>
					<h1 className="text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
						Contact {schoolName} Marketplace
					</h1>
					<p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
						If you have questions, feedback, or need help with the platform, you can reach out using the contact information below.
					</p>
				</header>

				<div
					className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 shadow-sm"
					style={{
						borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))",
						background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background))",
					}}
				>
					<h2 className="text-xl font-semibold text-[var(--color-text)]">What to include</h2>
					<ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--color-text-muted)]">
						<li>Your name and school email</li>
						<li>A short description of the issue or question</li>
						<li>Any relevant listing or account details</li>
					</ul>

					<div
						className="mt-6 rounded-[var(--radius)] border p-4"
						style={{
							borderColor: "color-mix(in srgb, var(--color-primary) 22%, var(--color-border))",
							background: "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 7%, var(--color-background)), var(--color-surface))",
						}}
					>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
							Email support
						</p>
						<a
							href="mailto:support@campusmarketplace.edu"
							className="mt-2 inline-block text-lg font-semibold text-[var(--color-primary)] transition hover:opacity-80"
						>
							campusmarketplace.dev@gmail.com
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
