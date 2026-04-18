import { ShoppingBag } from "lucide-react";

export function NoImagePlaceholder({ title, hidden = false }: { title: string; hidden?: boolean }) {
    return (
        <div
            className={`absolute inset-0 ${hidden ? "hidden" : "flex"} flex-col items-center justify-center gap-3`}
            style={{
                background: "repeating-linear-gradient(135deg, var(--color-background-alt) 0px, var(--color-background-alt) 10px, var(--color-border) 10px, var(--color-border) 11px)",
            }}
        >
            <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
                style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))" }}
            >
                <ShoppingBag size={26} style={{ color: "var(--color-primary)", opacity: 0.7 }} />
            </div>
            <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-muted)" }}
            >
                {title.slice(0, 18)}{title.length > 18 ? "…" : ""}
            </span>
        </div>
    );
}
