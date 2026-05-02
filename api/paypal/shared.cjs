const sandboxBaseUrl = 'https://api-m.sandbox.paypal.com'
const liveBaseUrl = 'https://api-m.paypal.com'

function getPayPalBaseUrl() {
  return process.env.PAYPAL_ENV === 'live' ? liveBaseUrl : sandboxBaseUrl
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`PayPal token request failed: ${details}`)
  }

  const data = await response.json()
  return data.access_token
}

async function paypalRequest(path, options = {}) {
  const accessToken = await getAccessToken()
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
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
    throw new Error(JSON.stringify(data))
  }

  return data
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

module.exports = {
  paypalRequest,
  sendJson,
}
