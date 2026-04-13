import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Preview,
  Section,
  Text,
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
    <Preview>{companyName} sent you invoice {invoiceNumber} for {currency} {amount}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={card}>
          <Text style={eyebrow}>RAYVO</Text>
          <Heading style={h1}>Your invoice is ready</Heading>
          <Text style={lead}>
            Hi {clientName}, {companyName} has shared invoice <strong>{invoiceNumber}</strong> with you.
          </Text>

          <Section style={summaryCard}>
            <Text style={summaryLabel}>Amount due</Text>
            <Text style={summaryValue}>{currency} {amount}</Text>
            <Text style={summaryMeta}>Due date: {dueDate || 'On receipt'}</Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Invoice number</Text>
            <Text style={detailText}>{invoiceNumber}</Text>
          </Section>
          <Section style={detailRowLast}>
            <Text style={detailLabel}>Issued by</Text>
            <Text style={detailText}>{companyName}</Text>
          </Section>

          <Section style={buttonWrap}>
            <Button href={publicUrl} style={button}>Review invoice</Button>
          </Section>

          <Text style={helperText}>
            You can view the invoice online and download a PDF from the secure link above.
          </Text>
          <Text style={fallbackText}>
            If the button does not work, open this link in your browser:<br />
            <a href={publicUrl} style={link}>{publicUrl}</a>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Professional invoicing made simple.</Text>
        </Section>
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

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', Arial, sans-serif",
  margin: '0',
  padding: '32px 0',
}
const wrapper = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '0 16px',
}
const card = {
  backgroundColor: '#f7fbfc',
  border: '1px solid #d8e7eb',
  borderRadius: '24px',
  padding: '36px 32px',
}
const eyebrow = {
  margin: '0 0 12px',
  color: 'hsl(192, 75%, 36%)',
  fontSize: '12px',
  fontWeight: '700' as const,
  letterSpacing: '0.2em',
}
const h1 = {
  margin: '0 0 12px',
  color: 'hsl(200, 30%, 8%)',
  fontSize: '32px',
  lineHeight: '1.15',
  fontWeight: '700' as const,
}
const lead = {
  margin: '0 0 24px',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '15px',
  lineHeight: '1.7',
}
const summaryCard = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  border: '1px solid #d8e7eb',
  padding: '24px',
  margin: '0 0 18px',
}
const summaryLabel = {
  margin: '0 0 8px',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '13px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}
const summaryValue = {
  margin: '0 0 8px',
  color: 'hsl(200, 30%, 8%)',
  fontSize: '34px',
  fontWeight: '700' as const,
  lineHeight: '1.1',
}
const summaryMeta = {
  margin: '0',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '14px',
}
const detailRow = {
  padding: '14px 0',
  borderBottom: '1px solid #d8e7eb',
}
const detailRowLast = {
  padding: '14px 0 0',
}
const detailLabel = {
  margin: '0 0 4px',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '13px',
}
const detailText = {
  margin: '0',
  color: 'hsl(200, 30%, 8%)',
  fontSize: '15px',
  fontWeight: '600' as const,
}
const buttonWrap = {
  textAlign: 'center' as const,
  margin: '28px 0 18px',
}
const button = {
  backgroundColor: 'hsl(192, 75%, 36%)',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600' as const,
  fontSize: '15px',
}
const helperText = {
  margin: '0 0 12px',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '14px',
  lineHeight: '1.6',
}
const fallbackText = {
  margin: '0',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '13px',
  lineHeight: '1.7',
}
const link = {
  color: 'hsl(192, 75%, 36%)',
  wordBreak: 'break-all' as const,
}
const hr = {
  borderColor: '#d8e7eb',
  margin: '24px 0 16px',
}
const footer = {
  margin: '0',
  color: 'hsl(200, 15%, 35%)',
  fontSize: '12px',
  textAlign: 'center' as const,
}
