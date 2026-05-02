const { paypalRequest, sendJson } = require('./shared.cjs')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const body = Buffer.concat(chunks).toString('utf8')
    const { orderId } = body ? JSON.parse(body) : {}

    if (!orderId) {
      sendJson(res, 400, { error: 'Missing orderId' })
      return
    }

    const capture = await paypalRequest(`/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
    })

    sendJson(res, 200, {
      id: capture.id,
      status: capture.status,
    })
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
}
