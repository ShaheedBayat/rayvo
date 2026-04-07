function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

interface PrepareTransactionalRecipientResult {
  unsubscribeToken: string | null
  suppressed: boolean
  error: string | null
}

export async function prepareTransactionalRecipient(supabase: any, email: string): Promise<PrepareTransactionalRecipientResult> {
  const normalizedEmail = email.toLowerCase()

  const { data: suppressedEmail, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (suppressionError) {
    return {
      unsubscribeToken: null,
      suppressed: false,
      error: 'Failed to check suppression list',
    }
  }

  if (suppressedEmail) {
    return {
      unsubscribeToken: null,
      suppressed: true,
      error: null,
    }
  }

  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    return {
      unsubscribeToken: null,
      suppressed: false,
      error: 'Failed to look up unsubscribe token',
    }
  }

  if (existingToken && !existingToken.used_at) {
    return {
      unsubscribeToken: existingToken.token,
      suppressed: false,
      error: null,
    }
  }

  if (existingToken?.used_at) {
    return {
      unsubscribeToken: null,
      suppressed: true,
      error: null,
    }
  }

  const generatedToken = generateToken()
  const { error: tokenError } = await supabase
    .from('email_unsubscribe_tokens')
    .upsert(
      { token: generatedToken, email: normalizedEmail },
      { onConflict: 'email', ignoreDuplicates: true },
    )

  if (tokenError) {
    return {
      unsubscribeToken: null,
      suppressed: false,
      error: 'Failed to create unsubscribe token',
    }
  }

  const { data: storedToken, error: reReadError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (reReadError || !storedToken) {
    return {
      unsubscribeToken: null,
      suppressed: false,
      error: 'Failed to confirm unsubscribe token storage',
    }
  }

  return {
    unsubscribeToken: storedToken.token,
    suppressed: false,
    error: null,
  }
}