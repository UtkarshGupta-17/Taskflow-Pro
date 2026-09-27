"use client";

export function WarningModal({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2D2D2D] border border-[#3A3A3A] rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-[#ECECEC] font-semibold text-base mb-2">{title}</h2>
        <p className="text-[#9CA3AF] text-sm mb-5">{message}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-[#FF6C37] text-white text-sm font-medium hover:bg-[#e85f2e] transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}