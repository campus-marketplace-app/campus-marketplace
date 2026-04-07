import { AlertTriangle, Info } from 'lucide-react';

type ConfirmModalProps = {
    title: string;
    message: string;
    variant: 'danger' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
};

/** Branded confirmation/alert modal — replaces native window.confirm() and alert(). */
export default function ConfirmModal({ title, message, variant, onConfirm, onCancel }: ConfirmModalProps) {
    const isInfo = variant === 'info';
    const Icon = isInfo ? Info : AlertTriangle;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon + title */}
                <div className="mb-3 flex items-center gap-3">
                    <Icon
                        size={22}
                        className={isInfo ? 'text-[var(--color-primary)]' : 'text-red-500'}
                        aria-hidden="true"
                    />
                    <h2
                        id="confirm-modal-title"
                        className="text-base font-semibold text-[var(--color-text)]"
                    >
                        {title}
                    </h2>
                </div>

                {/* Message */}
                <p className="mb-6 text-sm text-[var(--color-text-muted)] whitespace-pre-line">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                    {!isInfo && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-background)]"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`rounded-[var(--radius)] px-4 py-2 text-sm font-medium transition ${
                            isInfo
                                ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90'
                                : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                    >
                        {isInfo ? 'OK' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
