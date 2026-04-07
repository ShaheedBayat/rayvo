import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RayVo'

interface InvoiceEmailProps {
  invoiceNumber?: string
  clientName?: string
  amount?: string
  currency?: string
  dueDate?: string
  publicUrl?: string
  companyName?: string
}

const InvoiceEmail = ({
  invoiceNumber = 'INV-00001',
  clientName = 'Customer',
  amount = '0.00',
  currency = 'ZAR',
  dueDate = '',
  publicUrl = '#',
  companyName = SITE_NAME,
}: InvoiceEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Invoice {invoiceNumber} from {companyName} — {currency} {amount}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{companyName}</Heading>
        <div style={amountBox}>
          <Text style={invoiceLabel}>Invoice <strong style={{ color: '#1a1a1a' }}>{invoiceNumber}</strong></Text>
          <Text style={amountText}>{currency} {amount}</Text>
          <Text style={invoiceLabel}>Due: {dueDate}</Text>
        </div>
        <Text style={text}>
          Hi {clientName},
        </Text>
        <Text style={text}>
          Please find your invoice from <strong>{companyName}</strong>. You can view the full invoice and download a PDF by clicking the button below.
        </Text>
        <div style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href={publicUrl}>
            View Invoice
          </Button>
        </div>
        <Hr style={hr} />
        <Text style={footer}>Sent via {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceEmail,
  subject: (data: Record<string, any>) =>
    `Invoice ${data.invoiceNumber || 'INV-00001'} from ${data.companyName || SITE_NAME} — ${data.currency || 'ZAR'} ${data.amount || '0.00'}`,
  displayName: 'Invoice email',
  previewData: {
    invoiceNumber: 'INV-00042',
    clientName: 'Jane Doe',
    amount: '1,250.00',
    currency: 'ZAR',
    dueDate: '2026-04-30',
    publicUrl: 'https://rayvo.lovable.app/public/invoice/example',
    companyName: 'Acme Corp',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a1a', textAlign: 'center' as const, margin: '0 0 30px' }
const amountBox = { background: '#f8f9fa', borderRadius: '12px', padding: '30px', marginBottom: '24px', textAlign: 'center' as const }
const invoiceLabel = { color: '#666', fontSize: '14px', margin: '0 0 8px' }
const amountText = { color: '#1a1a1a', fontSize: '32px', fontWeight: '700' as const, margin: '0 0 8px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  display: 'inline-block',
  backgroundColor: 'hsl(192, 75%, 36%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600' as const,
  fontSize: '15px',
}
const hr = { borderColor: '#eee', margin: '30px 0' }
const footer = { fontSize: '12px', color: '#999', textAlign: 'center' as const }
