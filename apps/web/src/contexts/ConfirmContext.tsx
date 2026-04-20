import { createContext, useContext, useState, type ReactNode } from 'react';
import ConfirmModal from '../components/ConfirmModal';

type ModalState = {
    title: string;
    message: string;
    variant: 'danger' | 'info';
    confirmLabel?: string;
    resolve: (value: boolean) => void;
};

type ConfirmContextValue = {
    /** Shows a two-button danger modal. Resolves true if the user confirms, false if cancelled. */
    confirm: (title: string, message: string, confirmLabel?: string) => Promise<boolean>;
    /** Shows a single-button info modal. Resolves when the user clicks OK. */
    alert: (title: string, message: string) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmContextValue>(null!);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [modal, setModal] = useState<ModalState | null>(null);

    const confirm = (title: string, message: string, confirmLabel?: string) =>
        new Promise<boolean>((resolve) =>
            setModal({ title, message, variant: 'danger', confirmLabel, resolve })
        );

    const alert = (title: string, message: string) =>
        new Promise<void>((resolve) =>
            setModal({
                title,
                message,
                variant: 'info',
                resolve: () => resolve(),
            })
        );

    const handleClose = (result: boolean) => {
        modal?.resolve(result);
        setModal(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            {modal && (
                <ConfirmModal
                    title={modal.title}
                    message={modal.message}
                    variant={modal.variant}
                    confirmLabel={modal.confirmLabel}
                    onConfirm={() => handleClose(true)}
                    onCancel={() => handleClose(false)}
                />
            )}
        </ConfirmContext.Provider>
    );
}

/** Returns `{ confirm, alert }` functions that render a branded in-app modal. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
    return useContext(ConfirmContext);
}
