import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RayVo'

interface TeamInviteProps {
  role?: string
  companyName?: string
}

const TeamInviteEmail = ({
  role = 'staff',
  companyName = SITE_NAME,
}: TeamInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {companyName} on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Team Invitation</Heading>
        <Text style={text}>
          You've been invited to join <strong>{companyName}</strong> as a <strong>{role}</strong>.
        </Text>
        <Text style={text}>
          Sign up or log in to accept the invitation.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Sent via {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: `You've been invited to join ${SITE_NAME}`,
  displayName: 'Team invitation',
  previewData: { role: 'staff', companyName: 'Acme Corp' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 20px', maxWidth: '500px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#eee', margin: '30px 0' }
const footer = { fontSize: '12px', color: '#999', marginTop: '30px' }
