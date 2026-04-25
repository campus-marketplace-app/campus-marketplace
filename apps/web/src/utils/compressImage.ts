// Resize an image File so its long edge is at most `maxEdge` pixels and re-encode
// as JPEG at the given quality. This shrinks 8 MB phone photos to ~500 KB without
// noticeable quality loss in the listing thumbnails.
//
// Returns the original File untouched if it isn't a JPEG/PNG/WebP, if it's already
// within the size budget, or if anything in the canvas pipeline fails — better to
// upload a slightly large file than to block the user from posting a listing.
const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function compressImage(
    file: File,
    {
        maxEdge = 1920,
        quality = 0.85,
        skipBelowBytes = 1024 * 1024, // 1 MB — don't bother compressing already-small files
    }: { maxEdge?: number; quality?: number; skipBelowBytes?: number } = {},
): Promise<File> {
    if (!COMPRESSIBLE_TYPES.has(file.type)) return file;
    if (file.size <= skipBelowBytes) return file;

    try {
        const dataUrl = await readFileAsDataUrl(file);
        const img = await loadImage(dataUrl);
        const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxEdge);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (!blob) return file;
        if (blob.size >= file.size) return file;

        const compressedName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        return new File([blob], compressedName, { type: "image/jpeg" });
    } catch {
        return file;
    }
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image load failed"));
        img.src = src;
    });
}

function scaleToFit(srcW: number, srcH: number, maxEdge: number) {
    if (srcW <= maxEdge && srcH <= maxEdge) return { width: srcW, height: srcH };
    const scale = maxEdge / Math.max(srcW, srcH);
    return {
        width: Math.round(srcW * scale),
        height: Math.round(srcH * scale),
    };
}
