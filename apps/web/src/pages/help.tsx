import { Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

const WORKFLOWS = [
	{
		title: "Create an account",
		steps: [
			"Go to Sign Up and create your account using your student email.",
			"Sign in and complete your profile so other users can recognize you.",
		],
	},
	{
		title: "Browse and search listings",
		steps: [
			"Use the homepage search bar to find items or services.",
			"Filter by listing type and category to narrow results.",
			"Open a listing to view details, images, and price information.",
		],
	},
	{
		title: "Post a listing",
		steps: [
			"Open the post form from the sidebar.",
			"Add a title, description, price, and category. Your draft listing is saved in My Listings.",
			"Fill out all required fields, then publish your listing so other students can contact you.",
		],
	},
	{
		title: "Message a buyer or seller",
		steps: [
			"Open a listing and start a conversation.",
			"Use the Messages page to continue the chat.",
			"Keep communication clear by including pickup time and location details.",
		],
	},
	{
		title: "Save and manage listings",
		steps: [
			"Use Wishlist to save listings you want to revisit.",
			"Go to My Listings to edit, unpublish, or remove your own posts.",
		],
	},
];

export default function Help() {
	const { schoolName, radiusId } = useTheme();
	const isPill = radiusId === "pill";

	return (
		<section className="bg-[var(--color-secondary)] px-4 py-8 sm:px-6 sm:py-10">
			<div
				className="mx-auto max-w-[760px] rounded-xl border bg-[var(--color-secondary)] p-5 shadow-lg sm:p-6"
				style={{ borderColor: "var(--color-border)" }}
			>
				{/* Page header */}
				<div className={`mb-5${isPill ? " text-center px-3 sm:px-5" : ""}`}>
					<h1 className="text-2xl font-bold text-[var(--color-text)] sm:text-3xl">Help Center</h1>
					<p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
						Use this page as a quick guide for common workflows in {schoolName} Marketplace.
					</p>
				</div>

				{/* Workflow cards */}
				<div className="space-y-3">
					{WORKFLOWS.map((workflow) => (
						<div
							key={workflow.title}
							className="rounded-lg border bg-[var(--color-surface)] p-4"
							style={{
								borderColor: "var(--color-border)",
							}}
						>
						<h2 className={`text-base font-semibold text-[var(--color-text)]${isPill ? " text-center px-3 sm:px-5" : ""}`}>{workflow.title}</h2>
						<ul className={`mt-2 space-y-1.5${isPill ? " text-center px-3 sm:px-5" : ""}`}>
								{workflow.steps.map((step) => (
									<li key={step} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
										<span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-primary)]" />
										{step}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* Action buttons */}
				<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Link
						to="/contact"
						className="rounded-lg bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--color-text-on-primary)] transition hover:opacity-90"
					>
						Contact Us
					</Link>
					<Link
						to="/login"
						className="rounded-lg border bg-[var(--color-secondary)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-background)]"
						style={{ borderColor: "var(--color-border)" }}
					>
						Back to Login
					</Link>
				</div>
			</div>
		</section>
	);
}
