import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  paypalRequest,
} from '../_shared/paypal.js'

export const onRequestGet = () => methodNotAllowed()

export async function onRequestPost({ env, request }) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return errorResponse(new Error('Missing orderId'), 400)
    }

    const capture = await paypalRequest(
      env,
      `/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
      },
    )

    return jsonResponse({
      id: capture.id,
      status: capture.status,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
