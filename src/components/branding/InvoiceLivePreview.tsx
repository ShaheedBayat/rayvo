import { BrandingTheme } from '@/hooks/useBrandingThemes';

interface LivePreviewProps {
  theme: BrandingTheme;
}

export default function InvoiceLivePreview({ theme }: LivePreviewProps) {
  const scale = 0.55;

  return (
    <div className="sticky top-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Live Preview</p>
      <div
        className="rounded-xl border bg-white overflow-hidden shadow-lg"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%`, height: theme.pageSize === 'A4' ? '842px' : '792px' }}
      >
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: `${theme.fontSize}px`,
            paddingTop: `${theme.topMargin * 37.8}px`,
            paddingBottom: `${theme.bottomMargin * 37.8}px`,
            paddingLeft: '40px',
            paddingRight: '40px',
            position: 'relative',
            height: '100%',
            color: '#1a1a1a',
          }}
        >
          {/* Watermark */}
          {theme.watermark && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                fontSize: '64px',
                fontWeight: 700,
                color: 'rgba(0,0,0,0.04)',
                letterSpacing: '8px',
                textTransform: 'uppercase',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {theme.watermark}
            </div>
          )}

          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: theme.logoAlignment === 'center' ? 'center' : theme.logoAlignment === 'right' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
              marginBottom: '24px',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: theme.logoAlignment === 'right' ? 'row-reverse' : 'row', gap: '16px', alignItems: 'flex-start', width: '100%' }}>
              {theme.showLogo && (
                <div
                  style={{
                    width: '80px',
                    height: '40px',
                    borderRadius: '6px',
                    backgroundColor: theme.primaryColor + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: `1px solid ${theme.primaryColor}30`,
                  }}
                >
                  {theme.logo ? (
                    <img src={theme.logo} alt="Logo" style={{ maxWidth: '70px', maxHeight: '34px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '9px', color: theme.primaryColor, fontWeight: 600 }}>LOGO</span>
                  )}
                </div>
              )}
              <div style={{ flex: 1 }}>
                {theme.companyHeaderDetails ? (
                  <p style={{ fontSize: '8px', color: '#666', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{theme.companyHeaderDetails}</p>
                ) : (
                  <>
                    <p style={{ fontWeight: 600, fontSize: '11px', color: theme.primaryColor }}>Company Name</p>
                    <p style={{ fontSize: '8px', color: '#888', marginTop: '2px' }}>123 Business Street, City</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Invoice title */}
          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: theme.primaryColor, letterSpacing: '-0.5px' }}>
              {theme.documentTitles.draft_invoice || 'Draft Invoice'}
            </h2>
            <p style={{ fontSize: '8px', color: '#888', marginTop: '2px' }}>INV-00001</p>
          </div>

          {/* Bill To */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingTop: `${theme.addressPadding * 10}px` }}>
            <div>
              <p style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', marginBottom: '4px' }}>Bill To</p>
              <p style={{ fontWeight: 600, fontSize: '10px' }}>Customer Name</p>
              <p style={{ fontSize: '8px', color: '#666' }}>customer@email.com</p>
              <p style={{ fontSize: '8px', color: '#666' }}>123 Client Road, Town</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', marginBottom: '4px' }}>Details</p>
              <p style={{ fontSize: '8px', color: '#666' }}>Date: 23 Feb 2026</p>
              <p style={{ fontSize: '8px', color: '#666' }}>Due: 25 Mar 2026</p>
              {theme.showTaxNumber && <p style={{ fontSize: '8px', color: '#666' }}>Tax #: VAT123456</p>}
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '16px' }}>
            {theme.showColumnHeadings && (
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.primaryColor}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 600, color: theme.primaryColor }}>Description</th>
                  {theme.showItemCode && <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 600, color: theme.primaryColor }}>Code</th>}
                  {theme.showUnitPriceQuantity && (
                    <>
                      <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600, color: theme.primaryColor }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600, color: theme.primaryColor }}>Price</th>
                    </>
                  )}
                  {theme.showTaxColumn && <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600, color: theme.primaryColor }}>Tax</th>}
                  <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600, color: theme.primaryColor }}>Amount</th>
                </tr>
              </thead>
            )}
            <tbody>
              {[
                { desc: 'Website Design & Development', code: 'WEB-001', qty: 1, price: 15000, tax: 2250 },
                { desc: 'Monthly Hosting & Maintenance', code: 'HOST-001', qty: 3, price: 500, tax: 225 },
              ].map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 4px' }}>{item.desc}</td>
                  {theme.showItemCode && <td style={{ padding: '6px 4px' }}>{item.code}</td>}
                  {theme.showUnitPriceQuantity && (
                    <>
                      <td style={{ textAlign: 'right', padding: '6px 4px' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px' }}>R{item.price.toLocaleString()}</td>
                    </>
                  )}
                  {theme.showTaxColumn && <td style={{ textAlign: 'right', padding: '6px 4px' }}>R{item.tax.toLocaleString()}</td>}
                  <td style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600 }}>R{(item.qty * item.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <div style={{ width: '180px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0', color: '#666' }}>
                <span>Subtotal</span><span>R16,500.00</span>
              </div>
              {theme.taxDisplay === 'exclusive' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0', color: '#666' }}>
                  <span>VAT (15%)</span><span>R2,475.00</span>
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700,
                padding: '6px 0', borderTop: `2px solid ${theme.primaryColor}`, marginTop: '4px', color: theme.primaryColor,
              }}>
                <span>Total</span><span>R18,975.00</span>
              </div>
            </div>
          </div>

          {/* Bank details */}
          {theme.showBankDetails && (
            <div style={{ fontSize: '7px', color: '#888', borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '8px' }}>
              <p style={{ fontWeight: 600, marginBottom: '2px', color: '#666' }}>Banking Details</p>
              <p>Bank: First National Bank | Acc: 62012345678 | Branch: 250655</p>
            </div>
          )}

          {/* Terms */}
          {theme.termsInvoices && (
            <div style={{ fontSize: '7px', color: '#888', marginTop: '8px' }}>
              <p style={{ fontWeight: 600, marginBottom: '2px', color: '#666' }}>Terms & Conditions</p>
              <p style={{ whiteSpace: 'pre-line' }}>{theme.termsInvoices.slice(0, 120)}{theme.termsInvoices.length > 120 ? '...' : ''}</p>
            </div>
          )}

          {/* Footer */}
          {theme.footerMessage && (
            <div style={{ position: 'absolute', bottom: `${theme.bottomMargin * 37.8}px`, left: '40px', right: '40px', fontSize: '7px', color: '#aaa', textAlign: 'center' }}>
              {theme.footerMessage}
            </div>
          )}

          {/* QR Code placeholder */}
          {theme.showQrCode && (
            <div style={{ position: 'absolute', bottom: `${theme.bottomMargin * 37.8 + 8}px`, right: '40px' }}>
              <div style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '5px', color: '#ccc' }}>QR</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
