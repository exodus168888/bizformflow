import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  paypalRequest,
} from '../_shared/paypal.js'

export const onRequestGet = () => methodNotAllowed()

export async function onRequestPost({ env }) {
  try {
    const order = await paypalRequest(env, '/v2/checkout/orders', {
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

    return jsonResponse({ id: order.id })
  } catch (error) {
    return errorResponse(error)
  }
}
