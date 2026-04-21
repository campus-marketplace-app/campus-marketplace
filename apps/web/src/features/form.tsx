import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
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
import { useCategories } from '../hooks/useCategories';

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
    const { alert: showAlert } = useConfirm();
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
    const { categories } = useCategories();

    const handleListingImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        const allowedMimeTypes: ListingImageContentType[] = ['image/jpeg', 'image/png', 'image/webp'];
        const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() ?? '';
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

        if (!allowedMimeTypes.includes(selectedFile.type as ListingImageContentType) || !allowedExtensions.includes(fileExtension)) {
            event.target.value = '';
            await showAlert('Invalid file type', 'Only jpg, jpeg, png, and webp files are allowed.');
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

        if (listingDescription.trim().length > 2000) {
            alert('Description cannot exceed 2000 characters.');
            setIsSubmitting(false);
            return;
        }

        if (regex.test(listingDescription)) {
            alert('Description contains invalid content.');
            setIsSubmitting(false);
            return;
        }

        if (listingTitle.trim().length === 0) {
            alert('Title cannot be empty.');
            setIsSubmitting(false);
            return;
        }

        if (regex.test(listingTitle)) {
            alert('Title contains invalid content.');
            setIsSubmitting(false);
            return;
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
                // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                    if (!isSubmitting) {
                        onClose();
                    }
                }}
            />

            <div className="relative z-10 max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-b-2xl rounded-t-none bg-white p-5 shadow-xl sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="-mx-5 -mt-5 bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] px-5 py-6 sm:-mx-6 sm:-mt-6 sm:px-6">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="text-sm font-medium text-[var(--color-text-on-primary)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Back to Listings
                        </button>

                        <div className="mt-3 text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-on-primary)]">Create New Listing</h2>
                            <p className="mt-1 text-sm text-[var(--color-text-on-primary)]/85">Fill out the form below to list your item on the marketplace</p>
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Product Photos</p>
                        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/20 bg-white p-5 text-center text-sm text-black/60">
                            {imagePreviewUrl ? (
                                <img
                                    src={imagePreviewUrl}
                                    alt={listingImageLabel}
                                    className="h-44 w-full max-w-xs rounded-lg border border-black/10 object-cover"
                                />
                            ) : (
                                <>
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/5 text-2xl">📷</div>
                                    <p className="font-semibold text-black">Add Product Photos</p>
                                    <p className="text-xs text-black/50">or drag and drop (JPG, PNG • Max 10MB)</p>
                                </>
                            )}
                            <label className="cursor-pointer rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-black/5">
                                Choose Image
                                <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="hidden" onChange={handleListingImageChange} />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                Product Title
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={listingTitle}
                                onChange={(e) => setListingTitle(e.target.value)}
                                placeholder="Enter a catchy title for your listing"
                                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-black/35 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <p className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                    Listing Type
                                    {editListing && <span className="ml-1.5 normal-case font-normal text-black/40">(cannot be changed after creation)</span>}
                                </p>
                                <div className={`grid grid-cols-2 gap-1 rounded-lg border border-black/10 bg-white p-1 ${editListing ? 'opacity-60' : ''}`}>
                                    <input
                                        type="radio"
                                        id="item"
                                        name="listingType"
                                        value="item"
                                        checked={listingType === 'item'}
                                        onChange={() => setListingType('item')}
                                        disabled={!!editListing}
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor="item"
                                        className={`rounded-md border px-3 py-2 text-center text-sm font-semibold transition ${editListing ? 'cursor-default' : 'cursor-pointer'} ${listingType === 'item' ? 'border-[var(--color-primary-dark)] bg-[var(--color-primary)] text-white shadow-sm' : 'border-transparent bg-transparent text-black/75 hover:bg-black/5'}`}
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
                                        disabled={!!editListing}
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor="service"
                                        className={`rounded-md border px-3 py-2 text-center text-sm font-semibold transition ${editListing ? 'cursor-default' : 'cursor-pointer'} ${listingType === 'service' ? 'border-[var(--color-primary-dark)] bg-[var(--color-primary)] text-white shadow-sm' : 'border-transparent bg-transparent text-black/75 hover:bg-black/5'}`}
                                    >
                                        Service
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="price" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                    Price
                                </label>
                                <div className="relative rounded-lg border border-black/10 bg-white">
                                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-black/70">$</span>
                                    <input
                                        id="price"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={listingPrice}
                                        onChange={(e) => setListingPrice(parseFloat(e.target.value))}
                                        className="w-full rounded-lg bg-transparent py-2.5 pl-7 pr-4 text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="category" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    value={listingCategory}
                                    onChange={(e) => setListingCategory(e.target.value)}
                                    className="w-full overflow-y-auto rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none"
                                    size={1}
                                >
                                    <option value="">-- Select --</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {listingType === 'item' ? (
                                <>
                                    <div>
                                        <label htmlFor="condition" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                            Condition
                                        </label>
                                        <select
                                            id="condition"
                                            value={listingCondition}
                                            onChange={(e) => setListingCondition(e.target.value as ItemCondition)}
                                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-black"
                                        >
                                            <option value="new">New</option>
                                            <option value="like_new">Like New</option>
                                            <option value="good">Good</option>
                                            <option value="fair">Fair</option>
                                            <option value="poor">Poor</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="quantity" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                            Quantity
                                        </label>
                                        <input
                                            id="quantity"
                                            type="number"
                                            value={listingQuantity}
                                            onChange={(e) => setListingQuantity(parseInt(e.target.value, 10))}
                                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-black"
                                            min={1}
                                            max={99}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="duration" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                            Duration (minutes)
                                        </label>
                                        <input
                                            id="duration"
                                            type="number"
                                            min={1}
                                            value={durationMinutes}
                                            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="available-from" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                            Available From
                                        </label>
                                        <input
                                            id="available-from"
                                            type="time"
                                            value={availableFrom}
                                            onChange={(e) => setAvailableFrom(e.target.value)}
                                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label htmlFor="available-to" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                            Available To
                                        </label>
                                        <input
                                            id="available-to"
                                            type="time"
                                            value={availableTo}
                                            onChange={(e) => setAvailableTo(e.target.value)}
                                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="date" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                    Date Posted
                                </label>
                                <input
                                    id="date"
                                    type="datetime-local"
                                    readOnly={true}
                                    value={listingDate}
                                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black/70 outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="location" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                    Location
                                </label>
                                <input
                                    id="location"
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. Campus Center, Building A"
                                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-black/35"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="description" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">
                                Description
                            </label>
                            <textarea
                                id="description"
                                rows={5}
                                value={listingDescription}
                                onChange={(e) => setListingDescription(e.target.value)}
                                placeholder="Provide a detailed description of your item..."
                                className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-3 text-sm outline-none placeholder:text-black/35"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-black/10 pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Save as Draft
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg border border-[var(--color-primary-dark)] bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            + Publish Listing
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
