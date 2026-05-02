const sandboxBaseUrl = 'https://api-m.sandbox.paypal.com'
const liveBaseUrl = 'https://api-m.paypal.com'

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  })

const getPayPalBaseUrl = (env) =>
  env.PAYPAL_ENV === 'live' ? liveBaseUrl : sandboxBaseUrl

async function getAccessToken(env) {
  const clientId = env.PAYPAL_CLIENT_ID || env.VITE_PAYPAL_CLIENT_ID
  const clientSecret = env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET')
  }

  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch(`${getPayPalBaseUrl(env)}/v1/oauth2/token`, {
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`PayPal token request failed (${response.status}): ${text}`)
  }

  return JSON.parse(text).access_token
}

export async function paypalRequest(env, path, options = {}) {
  const accessToken = await getAccessToken(env)
  const response = await fetch(`${getPayPalBaseUrl(env)}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new Error(`PayPal API failed (${response.status}): ${text}`)
  }

  return data
}

export const methodNotAllowed = () => jsonResponse({ error: 'Method not allowed' }, 405)

export const errorResponse = (error, status = 500) =>
  jsonResponse({ error: error instanceof Error ? error.message : String(error) }, status)

export { jsonResponse }
