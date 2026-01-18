
import React from 'react';

// Using a simple QR code API for simplicity without extra heavy dependencies
export const QRCodeDisplay: React.FC<{ url: string }> = ({ url }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

  return (
    <div className="bg-white p-2 rounded-lg shadow-xl inline-block border-4 border-slate-800">
      <img src={qrUrl} alt="Scan to control" className="w-32 h-32" />
      <p className="text-[10px] text-slate-900 font-bold mt-1 text-center uppercase tracking-tighter">Scan to Control</p>
    </div>
  );
};
