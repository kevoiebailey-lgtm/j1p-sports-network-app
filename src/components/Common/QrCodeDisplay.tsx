import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  title?: string;
  subTitle?: string;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  value,
  size = 200,
  fgColor = '#E5B868',
  bgColor = '#000000',
  title,
  subTitle
}) => {
  const qrValue = value || 'J1P-ATHLETE-CHECKIN';

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div 
        className="p-4 rounded-3xl border-2 border-[#E5B868] bg-[#000000] shadow-[0_0_30px_rgba(214,28,36,0.25)] relative overflow-hidden flex flex-col items-center justify-center"
        style={{ width: size + 32, height: size + 32 }}
      >
        <QRCodeSVG
          value={qrValue}
          size={size}
          fgColor={fgColor}
          bgColor={bgColor}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&auto=format&fit=crop&q=80',
            x: undefined,
            y: undefined,
            height: 28,
            width: 28,
            excavate: true,
          }}
        />
      </div>

      {(title || subTitle) && (
        <div className="text-center">
          {title && <p className="text-xs font-black uppercase text-white font-mono">{title}</p>}
          {subTitle && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{subTitle}</p>}
        </div>
      )}
    </div>
  );
};

