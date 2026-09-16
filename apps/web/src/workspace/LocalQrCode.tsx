import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const options = {
  type: 'svg' as const,
  errorCorrectionLevel: 'M' as const,
  margin: 4,
  width: 256,
  color: { dark: '#111111', light: '#ffffff' },
};

export function LocalQrCode({ accessUrl }: { accessUrl: string }) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let current = true;
    setSvg('');
    if (!accessUrl) return () => {
      current = false;
    };
    void QRCode.toString(accessUrl, options)
      .then(value => {
        if (current) setSvg(value);
      })
      .catch(() => {
        // QR generation is best-effort UI; never expose the credential in an error.
      });
    return () => {
      current = false;
    };
  }, [accessUrl]);

  return <div className="local-qr" role="img" aria-label="QR de acceso temporal del alumno">
    {svg && <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />}
  </div>;
}
