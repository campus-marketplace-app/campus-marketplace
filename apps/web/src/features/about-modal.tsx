import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}>
        <div className="bg-[var(--color-primary)] text-white px-8 py-6 rounded-t-2xl relative">
          <h2 className="text-2xl font-bold text-center">About NJIT Marketplace</h2>
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
            <p className="leading-relaxed text-lg" style={{ color: "var(--color-text-muted)" }}>
              Campus Marketplace is a place for students to buy, sell, and share items or services within their school community. It helps students connect with each other for things like textbooks, furniture, electronics, tutoring, and more.
            </p>
          </div>

          <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--color-background)", borderColor: "var(--color-border)" }}>
            <h3 className="text-xl font-bold mb-3" style={{ color: "var(--color-text)" }}>How it works</h3>
            <p className="leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Students can create listings for items or services, browse what others have posted, and message each other directly through the platform. The goal is to make campus buying and selling simple, organized, and easy to use.
            </p>
          </div>

          <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--color-background)", borderColor: "var(--color-border)" }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: "var(--color-text)" }}>What you can find</h3>
            <ul className="space-y-3" style={{ color: "var(--color-text-muted)" }}>
              <li className="flex items-start gap-3">
                <span className="size-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm mt-0.5">✓</span>
                <span>School supplies and textbooks</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="size-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm mt-0.5">✓</span>
                <span>Furniture, electronics, and clothing</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="size-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm mt-0.5">✓</span>
                <span>Student services such as tutoring or campus help</span>
              </li>
            </ul>
          </div>

          <div className="border rounded-xl p-6" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))", borderColor: "color-mix(in srgb, var(--color-primary) 26%, var(--color-border))" }}>
            <h3 className="text-xl font-bold mb-3" style={{ color: "var(--color-text)" }}>More information</h3>
            <p className="leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              This platform is meant to support the campus community by making it easier for students to connect and exchange useful resources. Always use good judgment when meeting others and follow your school's safety guidelines.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Link
              to="/"
              className="flex-1 bg-[var(--color-primary)] text-white py-3 rounded-lg hover:opacity-90 transition-colors text-center font-medium shadow-md"
            >
              Browse Listings
            </Link>
            <button
              onClick={onClose}
              className="flex-1 border-2 border-[var(--color-primary)] text-[var(--color-primary)] py-3 rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors font-medium"
            >
              Sign Up
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
