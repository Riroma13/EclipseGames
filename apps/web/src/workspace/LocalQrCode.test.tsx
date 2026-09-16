// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QRCode from 'qrcode';
import { LocalQrCode } from './LocalQrCode';

describe('LocalQrCode', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.restoreAllMocks();
  });

  async function render(accessUrl: string) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<LocalQrCode accessUrl={accessUrl} />);
      await Promise.resolve();
    });
  }

  it('renders a real local SVG QR for the exact current URL without an external image', async () => {
    const accessUrl = '/#/show-student?token=temporary-token';
    const generate = vi.spyOn(QRCode, 'toString');
    await render(accessUrl);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

    expect(generate).toHaveBeenCalledWith(accessUrl, expect.objectContaining({ type: 'svg', margin: 4, width: 256 }));
    const qr = container?.querySelector('[role="img"]');
    expect(qr?.getAttribute('aria-label')).toBe('QR de acceso temporal del alumno');
    expect(qr?.querySelector('svg')).not.toBeNull();
    expect(qr?.querySelector('img')).toBeNull();
    expect(qr?.querySelector('svg')?.outerHTML).not.toMatch(/qr(server|code)|api\.qr/i);
  });

  it('removes the rendered QR when its URL is cleared or replaced', async () => {
    await render('/#/show-student?token=first');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container?.querySelector('svg')).not.toBeNull();

    await act(async () => { root?.render(<LocalQrCode accessUrl="" />); await Promise.resolve(); });
    expect(container?.querySelector('svg')).toBeNull();
    await act(async () => { root?.render(<LocalQrCode accessUrl="/#/show-student?token=second" />); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container?.querySelector('svg')).not.toBeNull();
  });
});
