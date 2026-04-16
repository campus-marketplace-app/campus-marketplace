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
	const { schoolName } = useTheme();

	return (
		<section className="px-6 py-8 sm:px-8 sm:py-10">
			<div className="mx-auto max-w-4xl space-y-6">
				<header
					className="rounded-[var(--radius-lg)] border p-6 shadow-sm sm:p-8"
					style={{
						borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))",
						background:
							"linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-background)), color-mix(in srgb, var(--color-secondary) 14%, var(--color-surface)))",
					}}
				>
					<h1 className="text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
						Help Center
					</h1>
					<p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
						Use this page as a quick guide for common workflows in {schoolName} Marketplace.
					</p>
				</header>

				<div className="space-y-4">
					{WORKFLOWS.map((workflow) => (
						<section
							key={workflow.title}
							className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 shadow-sm"
							style={{ borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))" }}
						>
							<h2 className="text-xl font-semibold text-[var(--color-text)]">{workflow.title}</h2>
							<ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-[var(--color-text-muted)]">
								{workflow.steps.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ol>
						</section>
					))}
				</div>
			</div>
		</section>
	);
}
