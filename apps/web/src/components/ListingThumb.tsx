import { useState } from "react";
import { NoImagePlaceholder } from "./NoImagePlaceholder";

// Renders a listing image, falling back to NoImagePlaceholder when the URL fails to load.
// Uses React state for the fallback so the placeholder survives re-renders — the previous
// pattern mutated the DOM directly via `e.currentTarget.style.display`, which got
// undone whenever the parent re-rendered (e.g. when filters changed).
export function ListingThumb({
    src,
    alt,
    title,
    className = "h-full w-full object-cover",
}: {
    src: string | undefined;
    alt: string;
    title: string;
    className?: string;
}) {
    const [errored, setErrored] = useState(false);

    if (!src || errored) {
        return <NoImagePlaceholder title={title} />;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setErrored(true)}
        />
    );
}
