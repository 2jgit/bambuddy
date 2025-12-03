import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { PrinterStatus } from '../../api/client';

interface Temperatures {
  bed?: number;
  bed_target?: number;
  nozzle?: number;
  nozzle_target?: number;
  nozzle_2?: number;
  nozzle_2_target?: number;
  chamber?: number;
}

interface TemperatureColumnProps {
  printerId: number;
  status: PrinterStatus | null | undefined;
  nozzleCount: number;
  disabled?: boolean;
}

type EditingField = 'nozzle' | 'nozzle_2' | 'bed' | null;

export function TemperatureColumn({ printerId, status, nozzleCount, disabled = false }: TemperatureColumnProps) {
  const temps = (status?.temperatures ?? {}) as Temperatures;
  const isDualNozzle = nozzleCount > 1;
  const isConnected = (status?.connected ?? false) && !disabled;

  const [editing, setEditing] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');

  const bedMutation = useMutation({
    mutationFn: (target: number) => api.setBedTemperature(printerId, target),
  });

  const nozzleMutation = useMutation({
    mutationFn: ({ target, nozzle }: { target: number; nozzle: number }) =>
      api.setNozzleTemperature(printerId, target, nozzle),
  });

  const lightMutation = useMutation({
    mutationFn: (on: boolean) => api.setChamberLight(printerId, on),
  });

  const startEditing = (field: EditingField, currentValue: number) => {
    if (!isConnected) return;
    setEditing(field);
    setEditValue(String(Math.round(currentValue)));
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditValue('');
  };

  const submitEdit = () => {
    const target = parseInt(editValue, 10);
    if (isNaN(target) || target < 0) {
      cancelEditing();
      return;
    }

    if (editing === 'bed') {
      bedMutation.mutate(target);
    } else if (editing === 'nozzle') {
      nozzleMutation.mutate({ target, nozzle: 0 });
    } else if (editing === 'nozzle_2') {
      nozzleMutation.mutate({ target, nozzle: 1 });
    }
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const isDisabled = !isConnected;

  const renderTargetTemp = (
    field: EditingField,
    targetValue: number
  ) => {
    if (editing === field) {
      return (
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={submitEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-12 text-sm bg-bambu-dark border border-bambu-green rounded px-1 py-0.5 text-white text-center"
          min={0}
          max={350}
        />
      );
    }
    return (
      <button
        onClick={() => startEditing(field, targetValue)}
        disabled={isDisabled}
        className="text-sm text-bambu-gray hover:text-bambu-green disabled:hover:text-bambu-gray disabled:cursor-not-allowed"
        title={isDisabled ? 'Printer not connected' : 'Click to set target temperature'}
      >
        /{Math.round(targetValue)} °C
      </button>
    );
  };

  return (
    <div className="flex flex-col justify-evenly min-w-[150px] pr-5 border-r border-bambu-dark-tertiary">
      {/* Nozzle 1 (Left) */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/hotend.svg" alt="" className="w-5 icon-theme" />
        </div>
        {isDualNozzle && (
          <span className="text-[11px] font-semibold text-bambu-green bg-bambu-green/20 px-1.5 py-0.5 rounded min-w-[18px] text-center flex-shrink-0">
            L
          </span>
        )}
        <span className="text-lg font-medium text-white">{Math.round(temps.nozzle ?? 0)}</span>
        {renderTargetTemp('nozzle', temps.nozzle_target ?? 0)}
      </div>

      {/* Nozzle 2 (Right) - only for dual nozzle */}
      {isDualNozzle && (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <img src="/icons/hotend.svg" alt="" className="w-5 icon-theme" />
          </div>
          <span className="text-[11px] font-semibold text-bambu-green bg-bambu-green/20 px-1.5 py-0.5 rounded min-w-[18px] text-center flex-shrink-0">
            R
          </span>
          <span className="text-lg font-medium text-white">{Math.round(temps.nozzle_2 ?? 0)}</span>
          {renderTargetTemp('nozzle_2', temps.nozzle_2_target ?? 0)}
        </div>
      )}

      {/* Bed */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/heatbed.svg" alt="" className="w-5 icon-theme" />
        </div>
        {isDualNozzle && <span className="min-w-[18px] flex-shrink-0" />}
        <span className="text-lg font-medium text-white">{Math.round(temps.bed ?? 0)}</span>
        {renderTargetTemp('bed', temps.bed_target ?? 0)}
      </div>

      {/* Chamber - read only */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/chamber.svg" alt="" className="w-5 icon-theme" />
        </div>
        {isDualNozzle && <span className="min-w-[18px] flex-shrink-0" />}
        <span className="text-lg font-medium text-white">{Math.round(temps.chamber ?? 0)}</span>
        <span className="text-sm text-bambu-gray">°C</span>
      </div>

      {/* Air Condition - button */}
      <button
        disabled={isDisabled}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/ventilation.svg" alt="" className="w-5 icon-theme" />
        </div>
        <span className="text-sm text-bambu-gray">Air Condition</span>
      </button>

      {/* Lamp - button (toggle, state not tracked in status yet) */}
      <button
        onClick={() => lightMutation.mutate(true)}
        disabled={isDisabled || lightMutation.isPending}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <img src="/icons/lamp.svg" alt="" className="w-4 icon-theme" />
        </div>
        <span className="text-sm text-bambu-gray">Lamp</span>
      </button>
    </div>
  );
}
