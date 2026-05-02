const { paypalRequest, sendJson } = require('./shared.cjs')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const order = await paypalRequest('/v2/checkout/orders', {
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '3.00',
            },
            description: 'BizFormFlow clean PDF export',
          },
        ],
      }),
      method: 'POST',
    })

    sendJson(res, 200, { id: order.id })
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
}
