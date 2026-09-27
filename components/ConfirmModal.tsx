"use client";

export function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2D2D2D] border border-[#3A3A3A] rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-[#ECECEC] font-semibold text-base mb-2">{title}</h2>
        <p className="text-[#9CA3AF] text-sm mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-[#9CA3AF] hover:text-[#ECECEC]">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm rounded-md bg-[#DC2626] text-white hover:bg-[#b91c1c] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}