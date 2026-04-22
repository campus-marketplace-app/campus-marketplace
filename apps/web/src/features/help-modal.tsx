import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}>
        <div className="bg-[var(--color-primary)] text-white px-8 py-6 rounded-t-2xl relative">
          <h2 className="text-2xl font-bold text-center">Help Center</h2>
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
              Use this page as a quick guide for common workflows in NJIT Marketplace.
            </p>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl p-5 border-l-4 border" style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-background)" }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--color-text)" }}>Create an account</h3>
              <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">1.</span>
                  <span>Go to Sign Up and create your account using your student email.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">2.</span>
                  <span>Sign in and complete your profile so other users can recognize you.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl p-5 border-l-4 border" style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-background)" }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--color-text)" }}>Browse and search listings</h3>
              <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Use the homepage search bar to find items or services.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Filter by listing type and category to narrow results.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Open a listing to view details, images, and price information.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl p-5 border-l-4 border" style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-background)" }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--color-text)" }}>Post a listing</h3>
              <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Open the post form from the sidebar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Add a title, description, price, and category. Your draft listing is saved in My Listings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Fill out all required fields, then publish your listing so other students can contact you.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl p-5 border-l-4 border" style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-background)" }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--color-text)" }}>Message a buyer or seller</h3>
              <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Open a listing and start a conversation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Use the Messages page to continue the chat.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Keep communication clear by including pickup time and location details.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl p-5 border-l-4 border" style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-background)" }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--color-text)" }}>Save and manage listings</h3>
              <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Use Wishlist to save listings you want to revisit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-1">•</span>
                  <span>Go to My Listings to edit, unpublish, or remove your own posts.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-[var(--color-primary)] text-white py-3 rounded-lg hover:opacity-90 transition-colors font-medium shadow-md"
            >
              Got it, thanks!
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
