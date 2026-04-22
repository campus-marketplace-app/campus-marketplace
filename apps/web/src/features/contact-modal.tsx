import { X, Mail } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}>
        <div className="bg-[var(--color-primary)] text-white px-8 py-6 rounded-t-2xl relative">
          <h2 className="text-2xl font-bold text-center">Contact NJIT Marketplace</h2>
          <button
            onClick={onClose}
            className="absolute right-8 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[calc(80vh-88px)] overflow-y-auto mr-2 pr-2">
          <div className="p-8 space-y-6">
          <div>
            <p className="leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              If you have questions, feedback, or need help with the platform, you can reach out using the contact information below.
            </p>
          </div>

          <div className="border rounded-xl p-6" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
            <h3 className="text-lg font-bold mb-3" style={{ color: "var(--color-text)" }}>What to include</h3>
            <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-primary)] mt-1">•</span>
                <span>Your name and school email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-primary)] mt-1">•</span>
                <span>A short description of the issue or question</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-primary)] mt-1">•</span>
                <span>Any relevant listing or account details</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <div className="size-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="size-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Email support</h3>
                <a
                  href="mailto:campusmarketplace.dev@gmail.com"
                  className="text-lg underline hover:text-white/80 transition-colors"
                >
                  campusmarketplace.dev@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-[var(--color-primary)] text-white py-3 rounded-lg hover:opacity-90 transition-colors font-medium shadow-md"
            >
              Close
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
