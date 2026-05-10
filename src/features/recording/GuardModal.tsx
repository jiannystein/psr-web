/**
 * GuardModal - New Recording confirmation dialog
 */

import { Button } from "@components/Button";

interface GuardModalProps {
  stepCount: number;
  onExportAndRecord: () => void;
  onDiscardAndRecord: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function GuardModal({ stepCount, onExportAndRecord, onDiscardAndRecord, onCancel, isOpen }: GuardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Start New Recording?</h2>
          <p className="text-sm text-[var(--muted)] mt-2">
            You have {stepCount} {stepCount === 1 ? "step" : "steps"} in the current session.
          </p>
        </div>

        <div className="p-6 space-y-3">
          <Button
            variant="primary"
            onClick={onExportAndRecord}
            className="w-full"
          >
            Export & Record
          </Button>
          <Button
            variant="secondary"
            onClick={onDiscardAndRecord}
            className="w-full"
          >
            Discard & Record
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        <div className="px-6 py-4 bg-[var(--bg)] border-t border-[var(--border)] text-xs text-[var(--muted)]">
          <p>
            <strong>Tip:</strong> Export saves your current steps with any annotations. You can download the HTML
            report and start a fresh recording.
          </p>
        </div>
      </div>
    </div>
  );
}
