import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { TextLayer } from '../types/studio';

interface TextEditorModalProps {
  layer: TextLayer | null;
  onSave: (id: string, text: string) => void;
  onClose: () => void;
}

export const TextEditorModal: React.FC<TextEditorModalProps> = ({
  layer,
  onSave,
  onClose,
}) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (layer) {
      setValue(layer.text);
    }
  }, [layer]);

  if (!layer) return null;

  const commit = () => {
    onSave(layer.id, value);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Text"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1A1A20] border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Edit Text Layer
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          autoFocus
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              commit();
            }
          }}
          className="w-full p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-base focus:outline-none focus:border-[#6366F1]"
          style={{ fontFamily: layer.fontFamily }}
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Tip: Ctrl/Cmd + Enter to save
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] hover:bg-[#5558E6] text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
