import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Printer, PrinterStatus } from '../../api/client';
import { X, Loader2, AlertTriangle, Check } from 'lucide-react';
import { Card, CardContent } from '../Card';

interface CalibrationModalProps {
  printer: Printer;
  status: PrinterStatus | null | undefined;
  onClose: () => void;
}

// Calibration stages that indicate active calibration
const CALIBRATION_STAGES = new Set([1, 3, 13, 25, 39, 40, 47, 48, 50]);

// Checkbox component matching Bambu Studio style
function Checkbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        checked
          ? 'bg-bambu-green border-bambu-green'
          : 'bg-transparent border-bambu-gray'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// Timeline step component - matches Bambu Studio style
function TimelineStep({
  step,
  name,
  isActive,
  isComplete,
  isLast,
}: {
  step: number;
  name: string;
  isActive: boolean;
  isComplete: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Circle and line container */}
      <div className="flex flex-col items-center">
        {/* Number circle */}
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
            isActive || isComplete
              ? 'bg-bambu-green text-white'
              : 'bg-bambu-green text-white'
          }`}
        >
          {step}
        </div>
        {/* Vertical connecting line */}
        {!isLast && (
          <div className={`w-0.5 h-6 ${isComplete ? 'bg-bambu-green' : 'bg-bambu-gray/30'}`} />
        )}
      </div>
      {/* Step name */}
      <span
        className={`text-sm pt-0.5 ${
          isActive ? 'text-white font-semibold' : 'text-bambu-gray'
        }`}
      >
        {name}
      </span>
    </div>
  );
}

export function CalibrationModal({ printer, status, onClose }: CalibrationModalProps) {
  const isConnected = status?.connected ?? false;
  const isDualNozzle = printer.nozzle_count === 2;
  const currentStage = status?.stg_cur ?? -1;

  // Track if we've started calibration (to switch to progress view)
  const [calibrationStarted, setCalibrationStarted] = useState(false);
  // Track if we've seen the printer actually enter calibration mode
  const [seenCalibrating, setSeenCalibrating] = useState(false);
  // Track if calibration has completed
  const [calibrationCompleted, setCalibrationCompleted] = useState(false);

  // Calibration options state - restore from localStorage if calibration is in progress
  const storageKey = `calibration_options_${printer.id}`;
  const savedOptions = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
  const parsedOptions = savedOptions ? JSON.parse(savedOptions) : null;

  const [bedLeveling, setBedLeveling] = useState(parsedOptions?.bedLeveling ?? true);
  const [vibration, setVibration] = useState(parsedOptions?.vibration ?? true);
  const [motorNoise, setMotorNoise] = useState(parsedOptions?.motorNoise ?? true);
  const [nozzleOffset, setNozzleOffset] = useState(parsedOptions?.nozzleOffset ?? isDualNozzle);
  const [highTempHeatbed, setHighTempHeatbed] = useState(parsedOptions?.highTempHeatbed ?? false);
  // Track if we've initialized based on calibration state
  const [initialized, setInitialized] = useState(false);

  // Detect if printer is currently calibrating
  // Check both stg_cur being a calibration stage AND state being RUNNING
  // (printer may keep stg_cur at last calibration stage after completion)
  const printerState = status?.state;
  const isCalibrating = CALIBRATION_STAGES.has(currentStage) && printerState === 'RUNNING';

  // If calibration is already in progress when modal opens, set tracking state
  // Checkbox values are preserved from localStorage
  useEffect(() => {
    if (!initialized && isCalibrating) {
      setSeenCalibrating(true);
      setCalibrationStarted(true);
      setInitialized(true);
    } else if (!initialized && !isCalibrating) {
      setInitialized(true);
    }
  }, [initialized, isCalibrating]);

  // Track when printer actually enters calibration mode
  useEffect(() => {
    if (isCalibrating && !seenCalibrating) {
      setSeenCalibrating(true);
      setCalibrationCompleted(false);
    }
  }, [isCalibrating, seenCalibrating]);

  // Auto-detect if calibration was started externally (e.g., from touchscreen)
  useEffect(() => {
    if (isCalibrating && !calibrationStarted) {
      setCalibrationStarted(true);
    }
  }, [isCalibrating, calibrationStarted]);

  // Detect when calibration completes:
  // - Must have seen calibration actually running (seenCalibrating is true)
  // - Now isCalibrating is false (stg_cur left calibration stages OR state is no longer RUNNING)
  useEffect(() => {
    if (seenCalibrating && !isCalibrating && !calibrationCompleted) {
      setCalibrationCompleted(true);
    }
  }, [seenCalibrating, isCalibrating, calibrationCompleted]);

  // Reset function to allow starting a new calibration
  const resetCalibration = () => {
    localStorage.removeItem(storageKey);
    setCalibrationStarted(false);
    setSeenCalibrating(false);
    setCalibrationCompleted(false);
    // Reset to defaults
    setBedLeveling(true);
    setVibration(true);
    setMotorNoise(true);
    setNozzleOffset(isDualNozzle);
    setHighTempHeatbed(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Start calibration mutation
  const calibrationMutation = useMutation({
    mutationFn: () =>
      api.startCalibration(printer.id, {
        bed_leveling: bedLeveling,
        vibration: vibration,
        motor_noise: motorNoise,
        nozzle_offset: nozzleOffset,
        high_temp_heatbed: highTempHeatbed,
      }),
    onSuccess: () => {
      // Save selected options to localStorage so they persist across modal close/open
      localStorage.setItem(storageKey, JSON.stringify({
        bedLeveling, vibration, motorNoise, nozzleOffset, highTempHeatbed
      }));
      setCalibrationStarted(true);
    },
  });

  const hasSelection = bedLeveling || vibration || motorNoise || nozzleOffset || highTempHeatbed;
  const canStart = isConnected && hasSelection && !calibrationMutation.isPending && !isCalibrating && !calibrationCompleted;

  // Build expected calibration flow based on selections
  // These are in the typical order the printer performs them
  const expectedFlow: { name: string; stages: number[] }[] = [];
  expectedFlow.push({ name: 'Homing toolhead', stages: [13] });
  if (bedLeveling || highTempHeatbed) {
    expectedFlow.push({ name: 'Cooling heatbed', stages: [50] });
  }
  if (bedLeveling) {
    expectedFlow.push({ name: 'Auto bed leveling - phase 1', stages: [1, 47] });
  }
  if (motorNoise) {
    expectedFlow.push({ name: 'Motor noise cancellation', stages: [25] });
  }
  if (vibration) {
    expectedFlow.push({ name: 'Vibration compensation', stages: [3] });
  }
  if (bedLeveling) {
    expectedFlow.push({ name: 'Auto bed leveling - phase 2', stages: [48] });
  }
  if (isDualNozzle && nozzleOffset) {
    expectedFlow.push({ name: 'Nozzle offset calibration', stages: [39] });
  }
  if (highTempHeatbed) {
    expectedFlow.push({ name: 'High-temp heatbed calibration', stages: [40] });
  }

  // Find current step index
  const currentStepIndex = expectedFlow.findIndex((step) =>
    step.stages.includes(currentStage)
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <CardContent className="p-0 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-bambu-dark-tertiary">
            <span className="text-sm font-medium text-white">Calibration</span>
            <button
              onClick={onClose}
              className="p-1 rounded text-bambu-gray hover:bg-bambu-dark-tertiary hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!isConnected && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/20 border border-red-500/50 rounded text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Printer not connected. Calibration cannot be started.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8">
              {/* Left column - Calibration step selection */}
              <div>
                <h3 className="text-base font-semibold text-white mb-4">Calibration step selection</h3>
                <div className="space-y-4">
                  {/* Bed leveling */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={bedLeveling}
                      onChange={setBedLeveling}
                      disabled={!isConnected || isCalibrating}
                    />
                    <span className="text-sm text-white">Bed leveling</span>
                  </div>

                  {/* Vibration compensation */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={vibration}
                      onChange={setVibration}
                      disabled={!isConnected || isCalibrating}
                    />
                    <span className="text-sm text-white">Vibration compensation</span>
                  </div>

                  {/* Motor noise cancellation */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={motorNoise}
                      onChange={setMotorNoise}
                      disabled={!isConnected || isCalibrating}
                    />
                    <span className="text-sm text-white">Motor noise cancellation</span>
                  </div>

                  {/* Nozzle offset calibration - only for dual nozzle printers */}
                  {isDualNozzle && (
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={nozzleOffset}
                        onChange={setNozzleOffset}
                        disabled={!isConnected || isCalibrating}
                      />
                      <span className="text-sm text-white">Nozzle offset calibration</span>
                    </div>
                  )}

                  {/* High-temperature Heatbed Calibration */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={highTempHeatbed}
                      onChange={setHighTempHeatbed}
                      disabled={!isConnected || isCalibrating}
                    />
                    <span className="text-sm text-white whitespace-nowrap">High-temperature Heatbed Calibration</span>
                  </div>
                </div>

                {/* Calibration program description */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-white mb-2">Calibration program</h4>
                  <p className="text-xs text-bambu-gray">
                    The calibration program detects the status of your device automatically to minimize deviation.
                    It keeps the device performing optimally.
                  </p>
                </div>
              </div>

              {/* Right column - Calibration Flow & Start button */}
              <div className="flex flex-col">
                <h3 className="text-base font-semibold text-bambu-green mb-4 text-center border-b border-bambu-dark-tertiary pb-2">
                  Calibration Flow
                </h3>

                {/* Timeline progress indicator */}
                <div className="flex-1 py-4 pl-4">
                  {hasSelection ? (
                    <div className="space-y-0">
                      {expectedFlow.map((step, index) => {
                        const isActive = calibrationStarted && !calibrationCompleted && step.stages.includes(currentStage);
                        const isComplete = calibrationCompleted || (calibrationStarted && currentStepIndex > index);
                        return (
                          <TimelineStep
                            key={step.name}
                            step={index + 1}
                            name={step.name}
                            isActive={isActive}
                            isComplete={isComplete}
                            isLast={index === expectedFlow.length - 1}
                          />
                        );
                      })}
                      {/* Show current stage name if it's not in expected flow */}
                      {currentStage >= 0 && currentStepIndex === -1 && status?.stg_cur_name && (
                        <div className="mt-4 text-xs text-bambu-gray">
                          Current: {status.stg_cur_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-bambu-gray italic">
                      Select calibration steps
                    </div>
                  )}
                </div>

                {/* Start/Calibrating/Completed button */}
                {calibrationCompleted ? (
                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-bambu-green text-white cursor-default"
                    >
                      <Check className="w-4 h-4" />
                      Completed
                    </button>
                    <button
                      onClick={resetCalibration}
                      className="w-full py-2 px-4 rounded-lg font-medium text-sm text-bambu-gray hover:text-white hover:bg-bambu-dark-tertiary transition-colors"
                    >
                      New Calibration
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => calibrationMutation.mutate()}
                    disabled={!canStart}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                      isCalibrating
                        ? 'bg-bambu-gray/50 text-white cursor-not-allowed'
                        : canStart
                        ? 'bg-bambu-green hover:bg-bambu-green/90 text-white'
                        : 'bg-bambu-dark-tertiary text-bambu-gray cursor-not-allowed'
                    }`}
                  >
                    {isCalibrating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Calibrating
                      </>
                    ) : calibrationMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      'Start Calibration'
                    )}
                  </button>
                )}

                {calibrationMutation.isError && (
                  <div className="mt-2 text-xs text-red-400 text-center">
                    {calibrationMutation.error?.message || 'Failed to start calibration'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
