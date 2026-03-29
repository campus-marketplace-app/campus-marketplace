import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
    createListing,
    deleteListingImage,
    getListingImageUrl,
    updateListing,
    uploadListingImage,
    upsertItemDetails,
    upsertServiceDetails,
} from '@campus-marketplace/backend';
import type { ItemCondition, ListingImageContentType, ListingWithDetails } from '@campus-marketplace/backend';
import type { ListingType, SessionUser } from './types';

type FormProps = {
    showForm: boolean;
    user: SessionUser | null;
    onClose: () => void;
    onSubmitSuccess?: () => void;
    editListing?: ListingWithDetails | null;
};

const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

export default function Form({
    showForm,
    user,
    onClose,
    onSubmitSuccess,
    editListing,
}: FormProps) {
    const [listingTitle, setListingTitle] = useState('Title');
    const [listingPrice, setListingPrice] = useState(0);
    const [listingCategory, setListingCategory] = useState('');
    const [listingCondition, setListingCondition] = useState<ItemCondition>('good');
    const [listingDate, setListingDate] = useState(getCurrentDateTimeLocal);
    const [listingDescription, setListingDescription] = useState('');
    const [listingImageLabel, setListingImageLabel] = useState('picture of the product');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [availableFrom, setAvailableFrom] = useState('09:00');
    const [availableTo, setAvailableTo] = useState('17:00');
    const [listingQuantity, setListingQuantity] = useState(1);
    const [listingType, setListingType] = useState<ListingType>('item');
    const [location, setLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    const handleListingImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        const allowedMimeTypes: ListingImageContentType[] = ['image/jpeg', 'image/png', 'image/webp'];
        const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() ?? '';
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

        if (!allowedMimeTypes.includes(selectedFile.type as ListingImageContentType) || !allowedExtensions.includes(fileExtension)) {
            alert('Only jpg, jpeg, png, and webp files are allowed.');
            event.target.value = '';
            return;
        }

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }

        const previewUrl = URL.createObjectURL(selectedFile);
        objectUrlRef.current = previewUrl;

        setSelectedImageFile(selectedFile);
        setListingImageLabel(selectedFile.name);
        setImagePreviewUrl(previewUrl);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        const regex = /<[^>]+>|javascript:|on\w+\s*=|data:text\/html|vbscript:/i;

        if (!user) {
            alert('You must be logged in to create a listing.');
            setIsSubmitting(false);
            return;
        }

        if(listingCategory === '') {
            alert('Please select a category for your listing.');
            setIsSubmitting(false);
            return;
        }

        if(listingDescription.trim().length > 2000 && !regex.test(listingDescription)) {
            alert('Description cannot exceed 2000 characters.');
            setIsSubmitting(false);
            return;
        }

        if(listingTitle.trim().length === 0) {
            if (regex.test(listingTitle)) {
                alert('Title cannot be empty.');
                setIsSubmitting(false);
                return;
            }
        }

        if(listingPrice < 0) {
            alert('Price cannot be negative.');
            setIsSubmitting(false);
            return;
        }

        if (listingType === 'item' && listingQuantity < 1) {
            alert('Quantity must be at least 1.');
            setIsSubmitting(false);
            return;
        }

        if (listingType === 'service' && durationMinutes <= 0) {
            alert('Duration must be greater than 0.');
            setIsSubmitting(false);
            return;
        }

        if (regex.test(location) || location.trim().length > 100) {
            alert('Location cannot exceed 100 characters.');
            setIsSubmitting(false);
            return;
        }

        const toTimeWithSeconds = (time: string) => (time.length === 5 ? `${time}:00` : time);

        try {
            const listingId = editListing?.id;
            let targetListingId = listingId;

            if (listingId) {
                await updateListing(listingId, user.id, {
                    title: listingTitle,
                    description: listingDescription,
                    price: listingPrice,
                    category_id: listingCategory,
                    location: location.trim() || null,
                });

                if (listingType === 'item') {
                    await upsertItemDetails(listingId, user.id, {
                        quantity: listingQuantity,
                        condition: listingCondition,
                    });
                } else if (listingType === 'service') {
                    await upsertServiceDetails(listingId, user.id, {
                        duration_minutes: durationMinutes,
                        price_unit: '',
                        available_from: toTimeWithSeconds(availableFrom),
                        available_to: toTimeWithSeconds(availableTo),
                    });
                }
            } else {
                const newlisting = await createListing({
                    user_id: user.id,
                    title: listingTitle,
                    type: listingType,
                    price: listingPrice,
                    description: listingDescription,
                    category_id: listingCategory,
                    price_unit: '$',
                    location: location.trim() || null,
                });
                targetListingId = newlisting.id;

                if (listingType === 'item') {
                    await upsertItemDetails(newlisting.id, user.id, {
                        quantity: listingQuantity,
                        condition: listingCondition,
                    });
                } else if (listingType === 'service') {
                    await upsertServiceDetails(newlisting.id, user.id, {
                        duration_minutes: durationMinutes,
                        price_unit: '',
                        available_from: toTimeWithSeconds(availableFrom),
                        available_to: toTimeWithSeconds(availableTo),
                    });
                }
            }

            if (selectedImageFile && targetListingId) {
                const existingImage = editListing?.images?.[0] ?? null;

                if (existingImage) {
                    await deleteListingImage(existingImage.id, user.id);
                }

                const extension = selectedImageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
                const baseName = selectedImageFile.name.replace(/\.[^/.]+$/, '');
                const cacheSafeFilename = `${baseName}-${Date.now()}.${extension}`;

                const uploadedImage = await uploadListingImage(
                    targetListingId,
                    user.id,
                    selectedImageFile,
                    selectedImageFile.type as ListingImageContentType,
                    {
                        alt_text: selectedImageFile.name,
                        filename: cacheSafeFilename,
                    },
                );

                const uploadedUrl = getListingImageUrl(uploadedImage.path);

                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                }

                setImagePreviewUrl(uploadedUrl);
            }

            onSubmitSuccess?.();
            setIsSubmitting(false);
            onClose();
        } catch (error) {
            console.error(editListing ? 'Error updating listing:' : 'Error creating listing:', error);
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        if (showForm) {
            document.body.style.overflow = 'hidden';
            if (editListing) {
                setListingTitle(editListing.title ?? 'Title');
                setListingPrice(editListing.price ?? 0);
                setListingCategory(editListing.category_id ?? '');
                setListingDescription(editListing.description ?? '');
                setLocation(editListing.location ?? '');
                setListingType(editListing.type);
                setListingDate(editListing.created_at ? editListing.created_at.slice(0, 16) : getCurrentDateTimeLocal());
                setListingImageLabel(editListing.images?.[0]?.alt_text ?? 'picture of the product');
                setSelectedImageFile(null);
                setImagePreviewUrl(editListing.images?.[0]?.path ? getListingImageUrl(editListing.images[0].path) : null);

                if (editListing.type === 'item' && editListing.item_details) {
                    setListingCondition(editListing.item_details.condition);
                    setListingQuantity(editListing.item_details.quantity);
                }

                if (editListing.type === 'service' && editListing.service_details) {
                    setDurationMinutes(editListing.service_details.duration_minutes);
                    setAvailableFrom((editListing.service_details.available_from ?? '09:00').slice(0, 5));
                    setAvailableTo((editListing.service_details.available_to ?? '17:00').slice(0, 5));
                }
            } else {
                setListingDate(getCurrentDateTimeLocal());
                setListingImageLabel('picture of the product');
                setSelectedImageFile(null);
                setImagePreviewUrl(null);
            }
        }

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [showForm, editListing]);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    if (!showForm) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                    if (!isSubmitting) {
                        onClose();
                    }
                }}
            />

            <div className="relative z-10 mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-sm bg-[var(--color-primary)] p-6 shadow-lg sm:p-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="mx-auto w-full max-w-sm">
                        <label htmlFor="title" className="mb-2 block text-center text-sm font-semibold uppercase tracking-wide text-white">
                            Title
                        </label>
                        <div className="rounded-2xl bg-white px-4 py-3 text-center text-3xl">
                            <input
                                id="title"
                                type="text"
                                value={listingTitle}
                                onChange={(e) => setListingTitle(e.target.value)}
                                className="w-full bg-transparent text-center text-3xl outline-none placeholder:text-black"
                            />
                        </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Product Image</p>
                            <div className="flex min-h-72 flex-col items-center justify-center gap-4 bg-[var(--color-accent)] p-6 text-center text-sm uppercase text-black">
                                {imagePreviewUrl ? (
                                    <img
                                        src={imagePreviewUrl}
                                        alt={listingImageLabel}
                                        className="h-40 w-full max-w-xs rounded-lg object-cover"
                                    />
                                ) : (
                                    <span>{listingImageLabel}</span>
                                )}
                                <label className="cursor-pointer rounded bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-100">
                                    Choose Image
                                    <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="hidden" onChange={handleListingImageChange} />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">Listing Type</p>
                                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/15 p-1">
                                        <input
                                            type="radio"
                                            id="item"
                                            name="listingType"
                                            value="item"
                                            checked={listingType === 'item'}
                                            onChange={() => setListingType('item')}
                                            className="sr-only"
                                        />
                                        <label
                                            htmlFor="item"
                                            className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${listingType === 'item' ? 'border-black bg-black text-white shadow-md ring-2 ring-white/80' : 'border-white/60 bg-transparent text-white hover:bg-white/15'}`}
                                        >
                                            Item
                                        </label>

                                        <input
                                            type="radio"
                                            id="service"
                                            name="listingType"
                                            value="service"
                                            checked={listingType === 'service'}
                                            onChange={() => setListingType('service')}
                                            className="sr-only"
                                        />
                                        <label
                                            htmlFor="service"
                                            className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${listingType === 'service' ? 'border-black bg-black text-white shadow-md ring-2 ring-white/80' : 'border-white/60 bg-transparent text-white hover:bg-white/15'}`}
                                        >
                                            Service
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="price" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                        Price
                                    </label>
                                    <div className="relative rounded-xl bg-white">
                                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-black">$</span>
                                        <input
                                            id="price"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={listingPrice}
                                            onChange={(e) => setListingPrice(parseFloat(e.target.value))}
                                            className="w-full rounded-xl bg-transparent py-3 pl-7 pr-4 text-sm outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="category" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                        Category
                                    </label>
                                    <select
                                        id="category"
                                        value={listingCategory}
                                        onChange={(e) => setListingCategory(e.target.value)}
                                        className="w-full overflow-y-auto rounded-xl bg-white px-4 py-3 text-sm outline-none"
                                        size={1}
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="6a90f825-6c3c-4060-b5e1-ff394162bb6c">Furniture</option>
                                        <option value="716836e6-f8a2-4cba-aa63-36445e70496e">School Supplies</option>
                                        <option value="854c925a-84f6-4280-9c9e-b1452167bb33">Free Stuff</option>
                                        <option value="95fe7a36-cb29-4c97-9a4d-56dccc56a7de">Transportation</option>
                                        <option value="9f280f6c-d4f8-4178-8e61-059243d5c930">Clothing</option>
                                        <option value="b87122bf-36dc-418c-a489-cb8ad0497f34">Electronics</option>
                                        <option value="be4cc965-718d-4e7d-939f-9ace4dcc837c">Sports & Fitness</option>
                                        <option value="dc2b319a-1068-4b06-bcb3-11c1f3dd3fa2">Textbooks</option>
                                        <option value="744ab09f-350d-4f75-8b4a-cb84016545ef">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {listingType === 'item' ? (
                                    <>
                                        <div>
                                            <label htmlFor="condition" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Condition
                                            </label>
                                            <select
                                                id="condition"
                                                value={listingCondition}
                                                onChange={(e) => setListingCondition(e.target.value as ItemCondition)}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-black"
                                            >
                                                <option value="new">New</option>
                                                <option value="like_new">Like New</option>
                                                <option value="good">Good</option>
                                                <option value="fair">Fair</option>
                                                <option value="poor">Poor</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="quantity" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Quantity
                                            </label>
                                            <input
                                                id="quantity"
                                                type="number"
                                                value={listingQuantity}
                                                onChange={(e) => setListingQuantity(parseInt(e.target.value, 10))}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-black"
                                                min={1}
                                                max={99}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label htmlFor="duration" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Duration (minutes)
                                            </label>
                                            <input
                                                id="duration"
                                                type="number"
                                                min={1}
                                                value={durationMinutes}
                                                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="available-from" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Available From
                                            </label>
                                            <input
                                                id="available-from"
                                                type="time"
                                                value={availableFrom}
                                                onChange={(e) => setAvailableFrom(e.target.value)}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label htmlFor="available-to" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Available To
                                            </label>
                                            <input
                                                id="available-to"
                                                type="time"
                                                value={availableTo}
                                                onChange={(e) => setAvailableTo(e.target.value)}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <label htmlFor="date" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                    Date
                                </label>
                                <input
                                    id="date"
                                    type="datetime-local"
                                    readOnly={true}
                                    value={listingDate}
                                    className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="location" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                    Location
                                </label>
                                <input
                                    id="location"
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. Campus Center, Building A"
                                    className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-gray-400"
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    rows={5}
                                    value={listingDescription}
                                    onChange={(e) => setListingDescription(e.target.value)}
                                    className="w-full resize-none rounded-2xl bg-white px-4 py-4 text-sm outline-none placeholder:text-black"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-8">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            className="bg-[var(--color-accent)] px-8 py-2 text-2xl text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-700 disabled:hover:bg-gray-400"
                            onClick={onClose}
                        >
                            back
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[var(--color-accent)] px-8 py-2 text-2xl text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-700 disabled:hover:bg-gray-400"
                        >
                            Save draft
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
