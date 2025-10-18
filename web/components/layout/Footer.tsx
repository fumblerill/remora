"use client";

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-7xl px-4 py-2.5 text-center text-[11px] tracking-wide text-gray-500">
        {"\u00A9"} {currentYear} Infera
      </div>
    </footer>
  );
}
