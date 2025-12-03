import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, isConfirmationRequired } from '../../api/client';
import type { PrinterStatus } from '../../api/client';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';

interface ExtruderControlsProps {
  printerId: number;
  status: PrinterStatus | null | undefined;
  nozzleCount: number;
  disabled?: boolean;
}

export function ExtruderControls({ printerId, status, nozzleCount, disabled = false }: ExtruderControlsProps) {
  const isConnected = (status?.connected ?? false) && !disabled;
  const isPrinting = status?.state === 'RUNNING' || status?.state === 'PAUSE';
  const isDualNozzle = nozzleCount > 1;

  const [selectedNozzle, setSelectedNozzle] = useState<'left' | 'right'>('left');
  const [confirmModal, setConfirmModal] = useState<{
    token: string;
    warning: string;
    distance: number;
  } | null>(null);

  const extrudeMutation = useMutation({
    mutationFn: ({ distance, token }: { distance: number; token?: string }) => {
      // G-code for extrusion: relative mode, extrude, back to absolute
      // T0/T1 selects the tool for dual nozzle
      const toolSelect = isDualNozzle ? `T${selectedNozzle === 'left' ? 0 : 1}\n` : '';
      const gcode = `${toolSelect}G91\nG1 E${distance} F300\nG90`;
      return api.sendGcode(printerId, gcode, token);
    },
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

  const handleExtrude = (distance: number) => {
    extrudeMutation.mutate({ distance });
  };

  const handleConfirm = () => {
    if (confirmModal) {
      extrudeMutation.mutate({ distance: confirmModal.distance, token: confirmModal.token });
      setConfirmModal(null);
    }
  };

  const isDisabled = !isConnected || isPrinting || extrudeMutation.isPending;

  return (
    <>
      <div className="flex flex-col items-center gap-1.5 justify-center">
        {/* Left/Right Toggle - only for dual nozzle */}
        {isDualNozzle && (
          <div className={`flex rounded-md overflow-hidden border border-bambu-dark-tertiary mb-1 flex-shrink-0 ${isDisabled ? 'opacity-50' : ''}`}>
            <button
              onClick={() => setSelectedNozzle('left')}
              disabled={isDisabled}
              className={`px-3 py-1.5 text-sm border-r border-bambu-dark-tertiary transition-colors disabled:cursor-not-allowed ${
                selectedNozzle === 'left'
                  ? 'bg-bambu-green text-white'
                  : 'bg-bambu-dark-secondary text-bambu-gray hover:bg-bambu-dark-tertiary disabled:hover:bg-bambu-dark-secondary'
              }`}
            >
              Left
            </button>
            <button
              onClick={() => setSelectedNozzle('right')}
              disabled={isDisabled}
              className={`px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                selectedNozzle === 'right'
                  ? 'bg-bambu-green text-white'
                  : 'bg-bambu-dark-secondary text-bambu-gray hover:bg-bambu-dark-tertiary disabled:hover:bg-bambu-dark-secondary'
              }`}
            >
              Right
            </button>
          </div>
        )}

        {/* Extrude Up Button */}
        <button
          onClick={() => handleExtrude(5)}
          disabled={isDisabled}
          className="w-9 h-[30px] rounded-md bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary border border-bambu-dark-tertiary flex items-center justify-center text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          title="Extrude 5mm"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Extruder Image */}
        <div className="h-[120px] flex items-center justify-center">
          <img
            src={isDualNozzle ? "/icons/dual-extruder.png" : "/icons/single-extruder1.png"}
            alt={isDualNozzle ? "Dual Extruder" : "Single Extruder"}
            className="h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Retract Down Button */}
        <button
          onClick={() => handleExtrude(-5)}
          disabled={isDisabled}
          className="w-9 h-[30px] rounded-md bg-bambu-dark-secondary hover:bg-bambu-dark-tertiary border border-bambu-dark-tertiary flex items-center justify-center text-bambu-gray disabled:opacity-50 disabled:cursor-not-allowed"
          title="Retract 5mm"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Label */}
        <span className="text-xs text-bambu-gray mt-0.5">Extruder</span>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          title="Confirm Extrusion"
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
