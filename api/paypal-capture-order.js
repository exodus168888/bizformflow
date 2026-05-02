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

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`PayPal token request failed (${response.status}): ${text}`)
  }

  return JSON.parse(text).access_token
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
    throw new Error(`PayPal API failed (${response.status}): ${text}`)
  }

  return data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { orderId } = req.body || {}

    if (!orderId) {
      res.status(400).json({ error: 'Missing orderId' })
      return
    }

    const capture = await paypalRequest(`/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
    })

    res.status(200).json({
      id: capture.id,
      status: capture.status,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
}
