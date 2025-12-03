import { useMutation } from '@tanstack/react-query';
import { api, isConfirmationRequired } from '../../api/client';
import type { PrinterStatus } from '../../api/client';
import { useState } from 'react';
import { ConfirmModal } from '../ConfirmModal';

interface BedControlsProps {
  printerId: number;
  status: PrinterStatus | null | undefined;
  disabled?: boolean;
}

export function BedControls({ printerId, status, disabled = false }: BedControlsProps) {
  const isConnected = (status?.connected ?? false) && !disabled;

  const [confirmModal, setConfirmModal] = useState<{
    token: string;
    warning: string;
    distance: number;
  } | null>(null);

  const moveMutation = useMutation({
    mutationFn: ({ distance, token }: { distance: number; token?: string }) =>
      api.moveAxis(printerId, 'Z', distance, 1000, token),
    onSuccess: (result, variables) => {
      if (isConfirmationRequired(result)) {
        setConfirmModal({
          token: result.token,
          warning: result.warning,
          distance: variables.distance,
        });
      }
    },
  });

  const handleMove = (distance: number) => {
    moveMutation.mutate({ distance });
  };

  const handleConfirm = () => {
    if (confirmModal) {
      moveMutation.mutate({ distance: confirmModal.distance, token: confirmModal.token });
      setConfirmModal(null);
    }
  };

  const isDisabled = !isConnected || moveMutation.isPending;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleMove(10)}
          disabled={isDisabled}
          className="px-3.5 py-2 rounded-md bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary border border-bambu-dark-tertiary text-sm text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          title="Z+10"
        >
          ↑10
        </button>
        <button
          onClick={() => handleMove(1)}
          disabled={isDisabled}
          className="px-3.5 py-2 rounded-md bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary border border-bambu-dark-tertiary text-sm text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          title="Z+1"
        >
          ↑1
        </button>
        <span className="px-2 py-2 text-sm text-bambu-gray">Bed</span>
        <button
          onClick={() => handleMove(-1)}
          disabled={isDisabled}
          className="px-3.5 py-2 rounded-md bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary border border-bambu-dark-tertiary text-sm text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          title="Z-1"
        >
          ↓1
        </button>
        <button
          onClick={() => handleMove(-10)}
          disabled={isDisabled}
          className="px-3.5 py-2 rounded-md bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary border border-bambu-dark-tertiary text-sm text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          title="Z-10"
        >
          ↓10
        </button>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          title="Confirm Bed Movement"
          message={confirmModal.warning}
          confirmText="Continue"
          variant="warning"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  );
}
