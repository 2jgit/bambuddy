import { useMutation } from '@tanstack/react-query';
import { api, isConfirmationRequired } from '../../api/client';
import type { PrinterStatus } from '../../api/client';
import { useState } from 'react';
import { ConfirmModal } from '../ConfirmModal';

interface JogPadProps {
  printerId: number;
  status: PrinterStatus | null | undefined;
  disabled?: boolean;
}

export function JogPad({ printerId, status, disabled = false }: JogPadProps) {
  const isConnected = (status?.connected ?? false) && !disabled;

  const [confirmModal, setConfirmModal] = useState<{
    action: string;
    token: string;
    warning: string;
    onConfirm: () => void;
  } | null>(null);

  const homeMutation = useMutation({
    mutationFn: ({ axes, token }: { axes: string; token?: string }) =>
      api.homeAxes(printerId, axes, token),
    onSuccess: (result) => {
      if (isConfirmationRequired(result)) {
        setConfirmModal({
          action: 'home',
          token: result.token,
          warning: result.warning,
          onConfirm: () => homeMutation.mutate({ axes: 'XY', token: result.token }),
        });
      }
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ axis, distance, token }: { axis: string; distance: number; token?: string }) =>
      api.moveAxis(printerId, axis, distance, 3000, token),
    onSuccess: (result, variables) => {
      if (isConfirmationRequired(result)) {
        setConfirmModal({
          action: 'move',
          token: result.token,
          warning: result.warning,
          onConfirm: () =>
            moveMutation.mutate({
              axis: variables.axis,
              distance: variables.distance,
              token: result.token,
            }),
        });
      }
    },
  });

  const handleHome = () => {
    homeMutation.mutate({ axes: 'XY' });
  };

  const handleMove = (axis: string, distance: number) => {
    moveMutation.mutate({ axis, distance });
  };

  const handleConfirm = () => {
    if (confirmModal) {
      confirmModal.onConfirm();
      setConfirmModal(null);
    }
  };

  const isLoading = homeMutation.isPending || moveMutation.isPending;
  const isDisabled = !isConnected || isLoading;

  return (
    <>
      <div className="relative w-[220px] h-[220px] mb-3.5">
        {/* Use the actual jogpad.svg from mockup */}
        <img
          src="/icons/jogpad.svg"
          alt="Jog Pad"
          className="w-full h-full jogpad-theme"
        />

        {/* Invisible clickable areas overlaid on the SVG */}
        {/* Outer ring - 10mm moves */}
        <button
          onClick={() => handleMove('Y', 10)}
          disabled={isDisabled}
          className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[40px] h-[30px] opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="Y+10"
        />
        <button
          onClick={() => handleMove('Y', -10)}
          disabled={isDisabled}
          className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[40px] h-[30px] opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="Y-10"
        />
        <button
          onClick={() => handleMove('X', -10)}
          disabled={isDisabled}
          className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[30px] h-[40px] opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="X-10"
        />
        <button
          onClick={() => handleMove('X', 10)}
          disabled={isDisabled}
          className="absolute right-[8px] top-1/2 -translate-y-1/2 w-[30px] h-[40px] opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="X+10"
        />

        {/* Inner ring - 1mm moves */}
        <button
          onClick={() => handleMove('Y', 1)}
          disabled={isDisabled}
          className="absolute top-[42px] left-1/2 -translate-x-1/2 w-[35px] h-[25px] opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="Y+1"
        />
        <button
          onClick={() => handleMove('Y', -1)}
          disabled={isDisabled}
          className="absolute bottom-[42px] left-1/2 -translate-x-1/2 w-[35px] h-[25px] opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="Y-1"
        />
        <button
          onClick={() => handleMove('X', -1)}
          disabled={isDisabled}
          className="absolute left-[42px] top-1/2 -translate-y-1/2 w-[25px] h-[35px] opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="X-1"
        />
        <button
          onClick={() => handleMove('X', 1)}
          disabled={isDisabled}
          className="absolute right-[42px] top-1/2 -translate-y-1/2 w-[25px] h-[35px] opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="X+1"
        />

        {/* Home button in center - clickable overlay */}
        <button
          onClick={handleHome}
          disabled={isDisabled}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50px] h-[50px] rounded-full opacity-0 hover:opacity-10 hover:bg-white disabled:cursor-not-allowed"
          title="Home XY"
        />
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          title="Confirm Action"
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
