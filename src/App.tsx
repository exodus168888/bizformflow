import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  BadgeDollarSign,
  Calculator,
  Download,
  FileText,
  Plus,
  ReceiptText,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import './App.css'

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, string | number | boolean>,
    ) => void
    paypal?: {
      Buttons: (options: {
        createOrder: (
          data: unknown,
          actions: {
            order: {
              create: (payload: {
                intent: 'CAPTURE'
                purchase_units: Array<{
                  amount: { currency_code: string; value: string }
                  description: string
                }>
              }) => Promise<string>
            }
          },
        ) => Promise<string>
        onApprove: (
          data: unknown,
          actions?: {
            order: {
              capture: () => Promise<{ id?: string; status?: string }>
            }
          },
        ) => Promise<void>
        onError?: (error: unknown) => void
        style?: Record<string, string | number | boolean>
      }) => {
        render: (selectorOrElement: string | HTMLElement) => Promise<void>
      }
    }
  }
}

type ToolType = 'invoice' | 'quote' | 'receipt'

type LineItem = {
  id: number
  description: string
  quantity: number
  rate: number
}

type BusinessDocument = {
  documentNumber: string
  issueDate: string
  dueDate: string
  businessName: string
  businessEmail: string
  businessAddress: string
  clientName: string
  clientEmail: string
  clientAddress: string
  notes: string
  taxRate: number
  discount: number
}

type SavedDraft = {
  document: BusinessDocument
  items: LineItem[]
}

const today = new Date()
const dueDate = new Date(today)
dueDate.setDate(today.getDate() + 14)

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const displayDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))

const starterDocument: BusinessDocument = {
  documentNumber: 'INV-0001',
  issueDate: formatDate(today),
  dueDate: formatDate(dueDate),
  businessName: 'Northstar Studio',
  businessEmail: 'billing@northstar.example',
  businessAddress: '128 Market Street\nSan Francisco, CA',
  clientName: 'Acme Retail Group',
  clientEmail: 'accounts@acme.example',
  clientAddress: '44 Commerce Avenue\nAustin, TX',
  notes: 'Thank you for your business. Payment is due by the date above.',
  taxRate: 8,
  discount: 50,
}

const starterItems: LineItem[] = [
  { id: 1, description: 'Website landing page design', quantity: 1, rate: 950 },
  { id: 2, description: 'Invoice automation setup', quantity: 3, rate: 120 },
]

const routeTitles: Record<string, string> = {
  '/': 'BizFormFlow Small Business Tools',
  '/break-even-calculator': 'Break-even Calculator',
  '/cash-flow-calculator': 'Cash Flow Calculator',
  '/contact': 'Contact BizFormFlow',
  '/contractor-pay-calculator': 'Contractor Pay Calculator',
  '/discount-calculator': 'Discount Calculator',
  '/freelance-rate-calculator': 'Freelance Rate Calculator',
  '/hourly-to-salary-calculator': 'Hourly to Salary Calculator',
  '/invoice-generator': 'Free Invoice Generator',
  '/late-fee-calculator': 'Late Fee Calculator',
  '/loan-payment-calculator': 'Loan Payment Calculator',
  '/markup-calculator': 'Markup Calculator',
  '/net-30-due-date-calculator': 'Net 30 Due Date Calculator',
  '/payment-fee-calculator': 'Payment Fee Calculator',
  '/pricing': 'BizFormFlow Pricing',
  '/privacy': 'BizFormFlow Privacy Policy',
  '/profit-margin-calculator': 'Profit Margin Calculator',
  '/purchase-order-generator': 'Purchase Order Generator',
  '/quote-generator': 'Free Quote Generator',
  '/receipt-maker': 'Receipt Maker',
  '/roi-calculator': 'ROI Calculator',
  '/sales-tax-calculator': 'Sales Tax Calculator',
  '/service-charge-calculator': 'Service Charge Calculator',
  '/terms': 'BizFormFlow Terms',
  '/vat-calculator': 'VAT Calculator',
}

const routeDescriptions: Record<string, string> = {
  '/': 'Free small business tools for invoices, quotes, receipts, profit margins, freelance rates, and PDF exports.',
  '/break-even-calculator':
    'Calculate break-even units, break-even revenue, and expected profit or loss from fixed costs, variable costs, price, and sales volume.',
  '/cash-flow-calculator':
    'Calculate net cash flow and ending cash from starting balance, cash inflows, outflows, and monthly burn.',
  '/contact': 'Contact BizFormFlow for support and partnership inquiries.',
  '/contractor-pay-calculator':
    'Estimate contractor gross pay, platform fees, reimbursable expenses, and net pay from hourly rate and hours worked.',
  '/discount-calculator':
    'Calculate discount amount, sale price, tax, and final total from original price, discount rate, quantity, and tax rate.',
  '/freelance-rate-calculator':
    'Estimate hourly, daily, monthly, and annual freelance rates from income goals, expenses, taxes, and billable hours.',
  '/hourly-to-salary-calculator':
    'Convert hourly rate to weekly, monthly, and annual salary based on hours per week and paid weeks per year.',
  '/invoice-generator':
    'Create a free invoice with line items, discounts, tax, autosave, live totals, and PDF export.',
  '/late-fee-calculator':
    'Calculate invoice late fees and total due from invoice amount, days late, percentage fee, daily fee, and fixed fee.',
  '/loan-payment-calculator':
    'Estimate monthly loan payment, total paid, and total interest from principal, interest rate, and loan term.',
  '/markup-calculator':
    'Calculate selling price, profit, margin, and markup from cost, markup percentage, and extra fees.',
  '/net-30-due-date-calculator':
    'Calculate invoice due dates for Net 7, Net 15, Net 30, Net 45, or Net 60 payment terms.',
  '/payment-fee-calculator':
    'Calculate PayPal, Stripe, Square, or custom payment processing fees and the gross amount needed to receive a target net payment.',
  '/pricing':
    'Review BizFormFlow paid export, Pro, and Business pricing options for small business tools.',
  '/privacy':
    'Read how BizFormFlow handles local drafts, analytics, ads, and payment disclosures.',
  '/profit-margin-calculator':
    'Calculate profit, margin, and markup from product cost, selling price, and fees.',
  '/purchase-order-generator':
    'Create a simple purchase order total with supplier, PO number, quantity, unit cost, shipping, and tax.',
  '/quote-generator':
    'Create a free quote or estimate with line items, discounts, tax, autosave, live totals, and PDF export.',
  '/receipt-maker':
    'Create a free receipt with line items, payment details, live totals, and PDF export.',
  '/roi-calculator':
    'Calculate return on investment, net gain, and ROI percentage from investment cost, revenue, and extra costs.',
  '/sales-tax-calculator':
    'Calculate sales tax, total price, and reverse tax from a tax-included amount for invoices, quotes, receipts, and product pricing.',
  '/service-charge-calculator':
    'Calculate service charges, tax, and final total for invoices, bills, events, and service transactions.',
  '/terms':
    'Read the BizFormFlow terms for using small business productivity tools.',
  '/vat-calculator':
    'Calculate VAT amount, gross total, and VAT-exclusive amount from net or VAT-included prices.',
}

const siteOrigin =
  import.meta.env.VITE_SITE_URL?.replace(/\/$/, '') ??
  'https://bizformflow.com'
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID ?? 'G-FRCTD5XLQY'
const paypalClientId =
  import.meta.env.VITE_PAYPAL_CLIENT_ID ??
  'AWjrFsmm7NZfosblD3IARz4xII0bdIsbhW57qTajhHK5BsAZT1saSzov264uclAJyACDJG9j5-946Ml4'
const supportEmail = 'support@bizformflow.com'
const cleanExportCreditsKey = 'bizformflow.cleanExportCredits.v1'
const creditsChangedEvent = 'bizformflow:credits-changed'

const getCleanExportCredits = () => {
  if (typeof window === 'undefined') {
    return 0
  }

  return Number(window.localStorage.getItem(cleanExportCreditsKey) ?? 0)
}

const setCleanExportCredits = (credits: number) => {
  window.localStorage.setItem(cleanExportCreditsKey, String(Math.max(credits, 0)))
  window.dispatchEvent(new Event(creditsChangedEvent))
}

const addCleanExportCredit = () => {
  setCleanExportCredits(getCleanExportCredits() + 1)
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

const trackEvent = (name: string, data: Record<string, string | number>) => {
  const conversionNames = new Set([
    'checkout_start',
    'clean_export_intent',
    'contact_lead',
    'crypto_checkout_start',
    'free_pdf_export',
    'pricing_view',
  ])

  window.gtag?.('event', name, {
    ...data,
    event_category: conversionNames.has(name) ? 'conversion' : 'engagement',
  })
  console.info('[analytics]', {
    data,
    name,
    timestamp: new Date().toISOString(),
  })
}

const getToolCopy = (tool: ToolType) => {
  if (tool === 'quote') {
    return {
      action: 'Generate clean quote PDF',
      documentLabel: 'Quote',
      documentNumber: 'Quote number',
      dueLabel: 'Expiry date',
      heading: 'Free quote generator for service businesses.',
      notes:
        'This quote is valid until the expiry date above. Pricing may change after approval.',
      numberPrefix: 'QTE',
      totalLabel: 'Estimated total',
    }
  }

  if (tool === 'receipt') {
    return {
      action: 'Generate clean receipt PDF',
      documentLabel: 'Receipt',
      documentNumber: 'Receipt number',
      dueLabel: 'Paid date',
      heading: 'Free receipt maker for paid invoices.',
      notes: 'Payment received. Keep this receipt for your records.',
      numberPrefix: 'RCT',
      totalLabel: 'Amount paid',
    }
  }

  return {
    action: 'Generate clean invoice PDF',
    documentLabel: 'Invoice',
    documentNumber: 'Invoice number',
    dueLabel: 'Due date',
    heading: 'Free invoice generator for small businesses.',
    notes: 'Thank you for your business. Payment is due by the date above.',
    numberPrefix: 'INV',
    totalLabel: 'Total due',
  }
}

const documentSeoContent: Record<
  ToolType,
  {
    commonMistakes: string[]
    faqs: Array<[string, string]>
    howTo: string[]
    purpose: string
    related: Array<[string, string]>
    who: string
  }
> = {
  invoice: {
    commonMistakes: [
      'Forgetting payment due dates, tax details, or clear line-item descriptions.',
      'Sending invoices without a consistent invoice number.',
      'Mixing estimates and final invoices in the same client workflow.',
    ],
    faqs: [
      [
        'Can I use this invoice generator for free?',
        'Yes. You can create an invoice, edit totals, and export a PDF without creating an account.',
      ],
      [
        'Where is my invoice data saved?',
        'Drafts are saved in your browser storage so refreshing the page does not immediately erase your work.',
      ],
      [
        'Does this replace accounting software?',
        'No. It is a simple document tool. You should still review tax, legal, and bookkeeping requirements for your business.',
      ],
    ],
    howTo: [
      'Enter your business and client information.',
      'Add each product or service as a separate line item.',
      'Set discount and tax values if they apply.',
      'Review the live preview, then export the invoice as a PDF.',
    ],
    purpose:
      'Use the invoice generator to create a simple billing document after work has been delivered or a payment is due.',
    related: [
      ['Create a quote before work starts', '/quote-generator'],
      ['Make a receipt after payment', '/receipt-maker'],
      ['Check service profitability', '/profit-margin-calculator'],
    ],
    who: 'Freelancers, consultants, agencies, contractors, creators, and small businesses that need quick invoices without a full accounting setup.',
  },
  quote: {
    commonMistakes: [
      'Sending a quote without an expiry date.',
      'Leaving the scope vague, which can cause disputes later.',
      'Forgetting to convert accepted quotes into invoices.',
    ],
    faqs: [
      [
        'What is the difference between a quote and an invoice?',
        'A quote estimates future work before approval. An invoice requests payment for work, products, or services.',
      ],
      [
        'Can I add tax and discounts?',
        'Yes. The quote generator supports line items, discounts, tax rate, and live totals.',
      ],
      [
        'Can I turn a quote into an invoice?',
        'For now, you can copy the same details into the invoice generator. A direct convert action is planned.',
      ],
    ],
    howTo: [
      'Describe the proposed service or product clearly.',
      'Add quantities, rates, discounts, and tax if needed.',
      'Set an expiry date so the client knows how long pricing is valid.',
      'Export the quote PDF and send it to the client for approval.',
    ],
    purpose:
      'Use the quote generator before work starts so a client can review pricing, scope, and estimated totals.',
    related: [
      ['Create the final invoice', '/invoice-generator'],
      ['Make a receipt after payment', '/receipt-maker'],
      ['Calculate your hourly rate', '/freelance-rate-calculator'],
    ],
    who: 'Service businesses, freelancers, tradespeople, and agencies that need to send estimates before beginning client work.',
  },
  receipt: {
    commonMistakes: [
      'Not marking the payment date clearly.',
      'Sending a receipt before payment is actually received.',
      'Forgetting to include what was paid for.',
    ],
    faqs: [
      [
        'When should I send a receipt?',
        'Send a receipt after payment is received so the client has proof of payment.',
      ],
      [
        'Is a receipt the same as an invoice?',
        'No. An invoice requests payment. A receipt confirms payment has already happened.',
      ],
      [
        'Can I export a PDF receipt?',
        'Yes. Fill in the receipt details and export a PDF from the tool.',
      ],
    ],
    howTo: [
      'Enter your business and client details.',
      'List what the customer paid for.',
      'Confirm the amount paid and payment date.',
      'Export the PDF receipt and keep a copy for your records.',
    ],
    purpose:
      'Use the receipt maker after a payment is completed to give the customer a simple record of the transaction.',
    related: [
      ['Create an invoice before payment', '/invoice-generator'],
      ['Create a quote before approval', '/quote-generator'],
      ['Check your margin', '/profit-margin-calculator'],
    ],
    who: 'Small businesses, freelancers, vendors, and service providers that need a quick payment confirmation document.',
  },
}

const calculatorSeoContent: Record<
  | 'breakEven'
  | 'cashFlow'
  | 'contractorPay'
  | 'discount'
  | 'fees'
  | 'freelance'
  | 'hourlySalary'
  | 'lateFee'
  | 'loan'
  | 'margin'
  | 'markup'
  | 'net30'
  | 'purchaseOrder'
  | 'roi'
  | 'salesTax'
  | 'serviceCharge'
  | 'vat',
  {
    faqs: Array<[string, string]>
    howTo: string[]
    purpose: string
    related: Array<[string, string]>
  }
> = {
  breakEven: {
    faqs: [
      [
        'What does break-even mean?',
        'Break-even is the point where revenue covers fixed and variable costs, so profit is zero before the business starts earning extra profit.',
      ],
      [
        'Why is contribution margin important?',
        'Contribution margin is selling price minus variable cost per unit. It shows how much each sale contributes toward fixed costs and profit.',
      ],
    ],
    howTo: [
      'Enter fixed costs such as rent, software, equipment, or monthly overhead.',
      'Enter variable cost per unit, such as materials, labor, packaging, or delivery.',
      'Enter the selling price per unit and expected sales volume.',
      'Review break-even units, break-even revenue, and expected profit or loss.',
    ],
    purpose:
      'Use this calculator to estimate how many units or client sales are needed before a product, service, or campaign becomes profitable.',
    related: [
      ['Check profit margin', '/profit-margin-calculator'],
      ['Estimate payment fees', '/payment-fee-calculator'],
      ['Create a quote', '/quote-generator'],
    ],
  },
  cashFlow: {
    faqs: [
      ['What is net cash flow?', 'Net cash flow is cash received minus cash spent during a period.'],
      ['Why track ending cash?', 'Ending cash helps you see whether the business can cover upcoming bills and operating expenses.'],
    ],
    howTo: [
      'Enter the starting cash balance.',
      'Add expected cash coming in.',
      'Add expected cash going out.',
      'Review net cash flow and ending cash.',
    ],
    purpose:
      'Use this calculator to quickly estimate whether a week or month leaves the business with more or less cash.',
    related: [
      ['Create an invoice', '/invoice-generator'],
      ['Check break-even point', '/break-even-calculator'],
      ['Estimate payment fees', '/payment-fee-calculator'],
    ],
  },
  contractorPay: {
    faqs: [
      ['What should contractor pay include?', 'Contractor pay should include hours worked, hourly rate, reimbursable expenses, and any platform or processing fees.'],
      ['Is contractor pay the same as employee salary?', 'No. Contractors usually handle their own taxes, insurance, benefits, and unpaid time.'],
    ],
    howTo: [
      'Enter the hourly rate and hours worked.',
      'Add reimbursable expenses.',
      'Add any platform or processing fee percentage.',
      'Review gross pay, fees, and net pay.',
    ],
    purpose:
      'Use this calculator to estimate contractor pay before approving work, creating a quote, or preparing an invoice.',
    related: [
      ['Estimate freelance rates', '/freelance-rate-calculator'],
      ['Create an invoice', '/invoice-generator'],
      ['Calculate payment fees', '/payment-fee-calculator'],
    ],
  },
  discount: {
    faqs: [
      ['How do I calculate a discount?', 'Multiply the original price by the discount percentage, then subtract that amount from the original price.'],
      ['Can I include tax after a discount?', 'Yes. Apply the discount first, then calculate tax on the discounted subtotal when that matches your local rules.'],
    ],
    howTo: [
      'Enter the original price.',
      'Enter the discount percentage and quantity.',
      'Add a tax rate if needed.',
      'Review sale price, discount amount, tax, and final total.',
    ],
    purpose:
      'Use this calculator to estimate sale prices, invoice discounts, quote discounts, and final totals after tax.',
    related: [
      ['Create a quote', '/quote-generator'],
      ['Create an invoice', '/invoice-generator'],
      ['Calculate sales tax', '/sales-tax-calculator'],
    ],
  },
  fees: {
    faqs: [
      [
        'Why should I calculate payment processing fees?',
        'Payment processors usually subtract a percentage fee and a fixed fee from each transaction, so the amount you receive can be lower than the amount charged.',
      ],
      [
        'Can I calculate how much to charge to receive a target amount?',
        'Yes. Enter your target net amount, fee percentage, and fixed fee to estimate the gross amount to charge before processing fees.',
      ],
    ],
    howTo: [
      'Choose a common processor or enter a custom percentage and fixed fee.',
      'Enter the amount you plan to charge a client or customer.',
      'Enter the net amount you want to receive after fees.',
      'Review estimated fees, net received, and gross charge needed for the target net amount.',
    ],
    purpose:
      'Use this calculator to estimate payment processing fees and price invoices, quotes, or online payments with fewer surprises.',
    related: [
      ['Create an invoice', '/invoice-generator'],
      ['Create a quote', '/quote-generator'],
      ['Check profit margin', '/profit-margin-calculator'],
    ],
  },
  hourlySalary: {
    faqs: [
      ['How do I convert hourly pay to annual salary?', 'Multiply hourly rate by hours per week, then multiply by paid weeks per year.'],
      ['Should I include unpaid weeks?', 'Use the number of paid weeks you realistically work or bill each year for a better estimate.'],
    ],
    howTo: [
      'Enter the hourly rate.',
      'Enter hours worked per week.',
      'Enter paid weeks per year.',
      'Review weekly, monthly, and annual equivalents.',
    ],
    purpose:
      'Use this calculator to compare hourly rates with weekly, monthly, and annual income.',
    related: [
      ['Estimate freelance rates', '/freelance-rate-calculator'],
      ['Calculate contractor pay', '/contractor-pay-calculator'],
      ['Create a quote', '/quote-generator'],
    ],
  },
  lateFee: {
    faqs: [
      ['How are late fees calculated?', 'Late fees may be a percentage, fixed amount, daily charge, or a combination depending on your payment terms.'],
      ['Should late fees be listed on invoices?', 'Yes. Payment terms and late fee policies should be clear before charging a client.'],
    ],
    howTo: [
      'Enter the invoice amount.',
      'Enter the number of days late.',
      'Add percentage, fixed, or daily late fees.',
      'Review the late fee and total due.',
    ],
    purpose:
      'Use this calculator to estimate late payment charges before following up on overdue invoices.',
    related: [
      ['Create an invoice', '/invoice-generator'],
      ['Calculate Net 30 dates', '/net-30-due-date-calculator'],
      ['Create a receipt', '/receipt-maker'],
    ],
  },
  loan: {
    faqs: [
      ['How is a monthly loan payment calculated?', 'Loan payments are estimated from principal, interest rate, and term using a standard amortization formula.'],
      ['Does this include taxes or fees?', 'No. Add lender fees, insurance, taxes, or other costs separately when comparing offers.'],
    ],
    howTo: [
      'Enter the loan amount.',
      'Enter the annual interest rate.',
      'Enter the term in years.',
      'Review monthly payment, total paid, and interest.',
    ],
    purpose:
      'Use this calculator to estimate loan payments before financing equipment, inventory, or business expenses.',
    related: [
      ['Check cash flow', '/cash-flow-calculator'],
      ['Calculate ROI', '/roi-calculator'],
      ['Check break-even point', '/break-even-calculator'],
    ],
  },
  markup: {
    faqs: [
      ['What is markup?', 'Markup is profit compared with cost, usually shown as a percentage added on top of cost.'],
      ['How is markup different from margin?', 'Markup compares profit to cost. Margin compares profit to selling price.'],
    ],
    howTo: [
      'Enter cost.',
      'Enter markup percentage.',
      'Add extra fees if needed.',
      'Review selling price, profit, and margin.',
    ],
    purpose:
      'Use this calculator to turn costs into selling prices and understand the margin created by a markup.',
    related: [
      ['Check profit margin', '/profit-margin-calculator'],
      ['Create a quote', '/quote-generator'],
      ['Calculate discount', '/discount-calculator'],
    ],
  },
  net30: {
    faqs: [
      ['What does Net 30 mean?', 'Net 30 means payment is due 30 days after the invoice date.'],
      ['Can I calculate other net terms?', 'Yes. Use the terms field for Net 7, Net 15, Net 30, Net 45, Net 60, or another number of days.'],
    ],
    howTo: [
      'Enter the invoice date.',
      'Enter the number of net payment days.',
      'Review the due date.',
      'Use the date on invoices or payment reminders.',
    ],
    purpose:
      'Use this calculator to set clear payment due dates for invoices and client follow-ups.',
    related: [
      ['Create an invoice', '/invoice-generator'],
      ['Calculate late fees', '/late-fee-calculator'],
      ['Create a receipt', '/receipt-maker'],
    ],
  },
  purchaseOrder: {
    faqs: [
      ['What is a purchase order?', 'A purchase order records what a buyer intends to purchase from a supplier, including quantities, costs, and totals.'],
      ['Is this a full procurement system?', 'No. It is a lightweight purchase order helper for estimating and documenting simple orders.'],
    ],
    howTo: [
      'Enter supplier and PO details.',
      'Add quantity, unit cost, shipping, and tax.',
      'Review subtotal, tax, and order total.',
      'Use the summary before sending or storing the order.',
    ],
    purpose:
      'Use this generator to draft a simple purchase order total for supplies, inventory, or vendor purchases.',
    related: [
      ['Create a receipt', '/receipt-maker'],
      ['Check cash flow', '/cash-flow-calculator'],
      ['Calculate sales tax', '/sales-tax-calculator'],
    ],
  },
  roi: {
    faqs: [
      ['What is ROI?', 'ROI compares net gain with investment cost to show the return as a percentage.'],
      ['What costs should I include?', 'Include ad spend, software, labor, fees, and other costs tied to the investment.'],
    ],
    howTo: [
      'Enter the investment cost.',
      'Enter revenue or value returned.',
      'Add extra costs if needed.',
      'Review net gain and ROI percentage.',
    ],
    purpose:
      'Use this calculator to compare campaigns, purchases, projects, and business investments.',
    related: [
      ['Check break-even point', '/break-even-calculator'],
      ['Check profit margin', '/profit-margin-calculator'],
      ['Calculate loan payments', '/loan-payment-calculator'],
    ],
  },
  salesTax: {
    faqs: [
      [
        'How do I calculate sales tax?',
        'Multiply the taxable subtotal by the sales tax rate. Add the tax amount to the subtotal to get the total price.',
      ],
      [
        'How do I remove tax from a tax-included price?',
        'Divide the tax-included total by one plus the tax rate. The result is the pre-tax subtotal, and the difference is the included tax.',
      ],
    ],
    howTo: [
      'Enter the pre-tax subtotal for the sale, quote, or invoice.',
      'Enter the sales tax rate that applies to the transaction.',
      'Review the calculated tax amount and total with tax.',
      'Use the tax-included field when you need to back out tax from a final price.',
    ],
    purpose:
      'Use this calculator to estimate sales tax on invoices, quotes, receipts, product pricing, and tax-included totals.',
    related: [
      ['Create an invoice', '/invoice-generator'],
      ['Create a receipt', '/receipt-maker'],
      ['Check profit margin', '/profit-margin-calculator'],
    ],
  },
  serviceCharge: {
    faqs: [
      ['What is a service charge?', 'A service charge is an added percentage or fee applied to a bill, invoice, event, or service transaction.'],
      ['Is a service charge the same as tax?', 'No. A service charge is added by the business, while tax is usually required by a tax authority.'],
    ],
    howTo: [
      'Enter the bill or invoice amount.',
      'Enter the service charge percentage.',
      'Add tax if needed.',
      'Review service charge, tax, and final total.',
    ],
    purpose:
      'Use this calculator to estimate service charges and final totals for client work, events, invoices, and bills.',
    related: [
      ['Create an invoice', '/invoice-generator'],
      ['Calculate sales tax', '/sales-tax-calculator'],
      ['Create a receipt', '/receipt-maker'],
    ],
  },
  vat: {
    faqs: [
      ['How do I calculate VAT?', 'Multiply the net price by the VAT rate, then add the VAT amount to get the gross price.'],
      ['How do I remove VAT from a VAT-included price?', 'Divide the gross price by one plus the VAT rate to estimate the net price.'],
    ],
    howTo: [
      'Enter the net amount.',
      'Enter the VAT rate.',
      'Optionally enter a VAT-included gross amount.',
      'Review VAT amount, gross total, and VAT-exclusive amount.',
    ],
    purpose:
      'Use this calculator to estimate VAT for quotes, invoices, receipts, and VAT-included product prices.',
    related: [
      ['Create an invoice', '/invoice-generator'],
      ['Create a quote', '/quote-generator'],
      ['Calculate sales tax', '/sales-tax-calculator'],
    ],
  },
  freelance: {
    faqs: [
      [
        'Why is my freelance hourly rate higher than a salary hourly rate?',
        'Freelancers usually need to cover taxes, unpaid time, business expenses, admin work, and non-billable hours.',
      ],
      [
        'Should I charge hourly or project-based?',
        'Hourly rates are useful for estimating baseline value. For repeatable work, project pricing may better reflect outcomes.',
      ],
    ],
    howTo: [
      'Enter the yearly income you want to keep.',
      'Add business expenses like software, equipment, and insurance.',
      'Estimate your tax rate and realistic billable hours.',
      'Use the hourly and day-rate outputs as a pricing baseline.',
    ],
    purpose:
      'Use this calculator to estimate a sustainable freelance rate based on income goals, expenses, taxes, and billable time.',
    related: [
      ['Send a quote with your rate', '/quote-generator'],
      ['Invoice approved work', '/invoice-generator'],
      ['Estimate payment fees', '/payment-fee-calculator'],
    ],
  },
  margin: {
    faqs: [
      [
        'What is profit margin?',
        'Profit margin is the percentage of selling price left after costs and fees are removed.',
      ],
      [
        'What is the difference between margin and markup?',
        'Margin compares profit to selling price. Markup compares profit to cost.',
      ],
    ],
    howTo: [
      'Enter the cost of the product or service.',
      'Enter the selling price charged to the customer.',
      'Add transaction, platform, or processing fees.',
      'Review profit, margin, and markup before pricing the offer.',
    ],
    purpose:
      'Use this calculator to understand whether a product, service, or project price leaves enough profit after costs and fees.',
    related: [
      ['Create an invoice', '/invoice-generator'],
      ['Create a quote', '/quote-generator'],
      ['Estimate payment fees', '/payment-fee-calculator'],
    ],
  },
}

const getDraftKey = (tool: ToolType) => `ledgerlaunch.${tool}.draft.v2`

const getInitialDraft = (tool: ToolType): SavedDraft => {
  const copy = getToolCopy(tool)
  const fallback = {
    document: {
      ...starterDocument,
      documentNumber: `${copy.numberPrefix}-0001`,
      notes: copy.notes,
    },
    items: starterItems,
  }

  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const saved = window.localStorage.getItem(getDraftKey(tool))
    if (!saved) {
      return fallback
    }

    const parsed = JSON.parse(saved) as SavedDraft
    return {
      document: { ...fallback.document, ...parsed.document },
      items: parsed.items?.length ? parsed.items : starterItems,
    }
  } catch {
    return fallback
  }
}

const buildPdf = async (
  tool: ToolType,
  document: BusinessDocument,
  items: LineItem[],
  totals: {
    discount: number
    subtotal: number
    tax: number
    total: number
  },
  options: { clean: boolean },
) => {
  const { jsPDF } = await import('jspdf')
  const copy = getToolCopy(tool)
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 48
  let y = 56

  pdf.setTextColor('#171a1f')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(28)
  pdf.text(copy.documentLabel, margin, y)
  pdf.setFontSize(16)
  pdf.text(document.businessName || 'Your business', pageWidth - margin, y, {
    align: 'right',
  })

  y += 30
  pdf.setDrawColor('#171a1f')
  pdf.setLineWidth(1.5)
  pdf.line(margin, y, pageWidth - margin, y)

  y += 32
  pdf.setFontSize(18)
  pdf.text(document.documentNumber, margin, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`Issued: ${displayDate(document.issueDate)}`, margin, y + 22)
  pdf.text(`${copy.dueLabel}: ${displayDate(document.dueDate)}`, margin, y + 38)

  pdf.setFont('helvetica', 'bold')
  pdf.text('From', margin, y + 76)
  pdf.text('Bill to', pageWidth / 2, y + 76)
  pdf.setFont('helvetica', 'normal')
  pdf.text(
    [document.businessName, document.businessEmail, document.businessAddress]
      .filter(Boolean)
      .join('\n'),
    margin,
    y + 94,
  )
  pdf.text(
    [document.clientName, document.clientEmail, document.clientAddress]
      .filter(Boolean)
      .join('\n'),
    pageWidth / 2,
    y + 94,
  )

  y += 166
  pdf.setFont('helvetica', 'bold')
  pdf.text('Description', margin, y)
  pdf.text('Qty', pageWidth - 220, y, { align: 'right' })
  pdf.text('Rate', pageWidth - 140, y, { align: 'right' })
  pdf.text('Amount', pageWidth - margin, y, { align: 'right' })
  pdf.setLineWidth(0.5)
  pdf.line(margin, y + 10, pageWidth - margin, y + 10)

  pdf.setFont('helvetica', 'normal')
  items.forEach((item) => {
    y += 30
    pdf.text(item.description || 'Service', margin, y)
    pdf.text(String(item.quantity), pageWidth - 220, y, { align: 'right' })
    pdf.text(currency.format(item.rate), pageWidth - 140, y, { align: 'right' })
    pdf.text(currency.format(item.quantity * item.rate), pageWidth - margin, y, {
      align: 'right',
    })
  })

  y += 34
  const totalX = pageWidth - 220
  const valueX = pageWidth - margin

  ;[
    ['Subtotal', currency.format(totals.subtotal)],
    ['Discount', `-${currency.format(totals.discount)}`],
    ['Tax', currency.format(totals.tax)],
  ].forEach(([label, value]) => {
    pdf.text(label, totalX, y)
    pdf.text(value, valueX, y, { align: 'right' })
    y += 22
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(copy.totalLabel, valueX, y + 8, { align: 'right' })
  pdf.setFontSize(18)
  pdf.text(currency.format(totals.total), valueX, y + 34, { align: 'right' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor('#6f716b')
  pdf.text(document.notes, margin, y + 82, {
    maxWidth: pageWidth - margin * 2,
  })

  if (!options.clean) {
    const footerY = pdf.internal.pageSize.getHeight() - 34
    pdf.setDrawColor('#dddcd4')
    pdf.line(margin, footerY - 16, pageWidth - margin, footerY - 16)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor('#6f716b')
    pdf.text('Created with BizFormFlow - upgrade for clean exports', margin, footerY)
  }

  pdf.save(`${document.documentNumber || copy.documentLabel}.pdf`)
}

function App() {
  return (
    <main className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/invoice-generator" element={<DocumentTool tool="invoice" />} />
        <Route path="/quote-generator" element={<DocumentTool tool="quote" />} />
        <Route path="/receipt-maker" element={<DocumentTool tool="receipt" />} />
        <Route path="/break-even-calculator" element={<BreakEvenCalculator />} />
        <Route path="/cash-flow-calculator" element={<CashFlowCalculator />} />
        <Route path="/contractor-pay-calculator" element={<ContractorPayCalculator />} />
        <Route path="/discount-calculator" element={<DiscountCalculator />} />
        <Route path="/hourly-to-salary-calculator" element={<HourlyToSalaryCalculator />} />
        <Route path="/late-fee-calculator" element={<LateFeeCalculator />} />
        <Route path="/loan-payment-calculator" element={<LoanPaymentCalculator />} />
        <Route path="/markup-calculator" element={<MarkupCalculator />} />
        <Route path="/net-30-due-date-calculator" element={<Net30DueDateCalculator />} />
        <Route path="/profit-margin-calculator" element={<ProfitMarginCalculator />} />
        <Route path="/purchase-order-generator" element={<PurchaseOrderGenerator />} />
        <Route path="/roi-calculator" element={<RoiCalculator />} />
        <Route
          path="/freelance-rate-calculator"
          element={<FreelanceRateCalculator />}
        />
        <Route path="/payment-fee-calculator" element={<PaymentFeeCalculator />} />
        <Route path="/sales-tax-calculator" element={<SalesTaxCalculator />} />
        <Route path="/service-charge-calculator" element={<ServiceChargeCalculator />} />
        <Route path="/vat-calculator" element={<VatCalculator />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/privacy" element={<PolicyPage type="privacy" />} />
        <Route path="/terms" element={<PolicyPage type="terms" />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
      <Footer />
    </main>
  )
}

function Header() {
  const location = useLocation()

  useEffect(() => {
    const title = routeTitles[location.pathname] ?? routeTitles['/']
    const description =
      routeDescriptions[location.pathname] ?? routeDescriptions['/']
    const canonical = `${siteOrigin}${location.pathname}`

    globalThis.document.title = title

    const setMeta = (selector: string, attr: string, value: string) => {
      const element = globalThis.document.querySelector(selector)
      element?.setAttribute(attr, value)
    }

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', canonical)
    setMeta('meta[name="twitter:title"]', 'content', title)
    setMeta('meta[name="twitter:description"]', 'content', description)
    setMeta('link[rel="canonical"]', 'href', canonical)

    window.gtag?.('config', gaMeasurementId, {
      page_location: canonical,
      page_path: location.pathname,
      page_title: title,
      send_page_view: true,
    })
    trackEvent('page_view', { path: location.pathname })
  }, [location.pathname])

  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="BizFormFlow home">
        <span className="brand-mark">BF</span>
        <span>BizFormFlow</span>
      </Link>
      <nav aria-label="Primary navigation">
        <NavLink to="/invoice-generator">Invoice</NavLink>
        <NavLink to="/quote-generator">Quote</NavLink>
        <NavLink to="/receipt-maker">Receipt</NavLink>
        <NavLink to="/break-even-calculator">Break-even</NavLink>
        <NavLink to="/profit-margin-calculator">Margin</NavLink>
        <NavLink to="/freelance-rate-calculator">Freelance</NavLink>
        <NavLink to="/payment-fee-calculator">Fees</NavLink>
        <NavLink to="/sales-tax-calculator">Tax</NavLink>
        <NavLink to="/pricing">Pricing</NavLink>
      </nav>
      <Link className="topbar-action" to="/pricing">
        <Sparkles size={16} />
        Pro
      </Link>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-summary">
        <Link className="brand footer-brand" to="/" aria-label="BizFormFlow home">
          <span className="brand-mark">BF</span>
          <span>BizFormFlow</span>
        </Link>
        <p>
          Free document generators and calculators for small business owners,
          freelancers, and service teams.
        </p>
      </div>
      <nav aria-label="Footer tools">
        <strong>Tools</strong>
        <Link to="/invoice-generator">Invoice generator</Link>
        <Link to="/quote-generator">Quote generator</Link>
        <Link to="/receipt-maker">Receipt maker</Link>
        <Link to="/break-even-calculator">Break-even calculator</Link>
        <Link to="/cash-flow-calculator">Cash flow calculator</Link>
        <Link to="/contractor-pay-calculator">Contractor pay calculator</Link>
        <Link to="/discount-calculator">Discount calculator</Link>
        <Link to="/hourly-to-salary-calculator">Hourly to salary calculator</Link>
        <Link to="/late-fee-calculator">Late fee calculator</Link>
        <Link to="/loan-payment-calculator">Loan payment calculator</Link>
        <Link to="/markup-calculator">Markup calculator</Link>
        <Link to="/net-30-due-date-calculator">Net 30 due date calculator</Link>
        <Link to="/profit-margin-calculator">Profit margin calculator</Link>
        <Link to="/purchase-order-generator">Purchase order generator</Link>
        <Link to="/roi-calculator">ROI calculator</Link>
        <Link to="/freelance-rate-calculator">Freelance rate calculator</Link>
        <Link to="/payment-fee-calculator">Payment fee calculator</Link>
        <Link to="/sales-tax-calculator">Sales tax calculator</Link>
        <Link to="/service-charge-calculator">Service charge calculator</Link>
        <Link to="/vat-calculator">VAT calculator</Link>
      </nav>
      <nav aria-label="Footer business">
        <strong>Business</strong>
        <Link to="/pricing">Pricing</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/contact">Contact</Link>
      </nav>
    </footer>
  )
}

function HomePage() {
  return (
    <>
      <section className="hero" id="top">
        <div className="hero-copy">
          <h1>Small business tools built to earn from day one.</h1>
          <p>
            Generate invoices, quotes, receipts, and business calculators from a
            shared platform with SEO pages, ad slots, paid PDF exports, and
            affiliate-ready surfaces.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" to="/invoice-generator">
              <FileText size={18} />
              Open invoice generator
            </Link>
            <Link className="secondary-link" to="/pricing">
              View monetization
            </Link>
          </div>
        </div>
        <RevenuePanel />
      </section>
      <SeoSection />
      <ToolPortfolio />
      <LegalTeaser />
    </>
  )
}

function RevenuePanel() {
  return (
    <aside className="revenue-panel" aria-label="Revenue model">
      <div>
        <span>Revenue slots</span>
        <strong>Ads + exports + Pro</strong>
      </div>
      <div className="ad-slot">Future sponsor or ad space</div>
      <button
        className="revenue-row revenue-button"
        type="button"
        onClick={() => trackEvent('paid_export_click', { source: 'hero' })}
      >
        <BadgeDollarSign size={18} />
        <span>Paid clean PDF export</span>
      </button>
      <button
        className="revenue-row revenue-button"
        type="button"
        onClick={() => trackEvent('affiliate_click', { partner: 'accounting' })}
      >
        <ReceiptText size={18} />
        <span>Accounting affiliate offer</span>
      </button>
    </aside>
  )
}

function DocumentTool({ tool }: { tool: ToolType }) {
  const navigate = useNavigate()
  const initialDraft = getInitialDraft(tool)
  const copy = getToolCopy(tool)
  const [document, setDocument] = useState<BusinessDocument>(
    initialDraft.document,
  )
  const [items, setItems] = useState<LineItem[]>(initialDraft.items)
  const [cleanCredits, setCleanCredits] = useState(getCleanExportCredits)

  useEffect(() => {
    const draft: SavedDraft = { document, items }
    window.localStorage.setItem(getDraftKey(tool), JSON.stringify(draft))
  }, [document, items, tool])

  useEffect(() => {
    const syncCredits = () => setCleanCredits(getCleanExportCredits())
    window.addEventListener(creditsChangedEvent, syncCredits)
    window.addEventListener('storage', syncCredits)

    return () => {
      window.removeEventListener(creditsChangedEvent, syncCredits)
      window.removeEventListener('storage', syncCredits)
    }
  }, [])

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0,
    )
    const discount = Math.min(document.discount, subtotal)
    const taxable = Math.max(subtotal - discount, 0)
    const tax = taxable * (document.taxRate / 100)
    const total = taxable + tax

    return { subtotal, discount, tax, total }
  }, [document.discount, document.taxRate, items])

  const updateDocument = <K extends keyof BusinessDocument>(
    key: K,
    value: BusinessDocument[K],
  ) => {
    setDocument((current) => ({ ...current, [key]: value }))
  }

  const updateItem = <K extends keyof LineItem>(
    id: number,
    key: K,
    value: LineItem[K],
  ) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    )
  }

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: tool === 'quote' ? 'Proposed service' : 'New service',
        quantity: 1,
        rate: 100,
      },
    ])
    trackEvent('line_item_add', { tool })
  }

  const removeItem = (id: number) => {
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    )
    trackEvent('line_item_remove', { tool })
  }

  const resetDraft = () => {
    setDocument({
      ...starterDocument,
      documentNumber: `${copy.numberPrefix}-0001`,
      notes: copy.notes,
    })
    setItems(starterItems)
    trackEvent('draft_reset', { tool })
  }

  const exportPdf = async (clean: boolean) => {
    if (clean && cleanCredits <= 0) {
      trackEvent('clean_export_intent', {
        amount: Math.round(totals.total),
        tool,
      })
      navigate('/pricing')
      return
    }

    await buildPdf(tool, document, items, totals, { clean })
    if (clean) {
      setCleanExportCredits(cleanCredits - 1)
    }
    trackEvent(clean ? 'clean_pdf_export_preview' : 'free_pdf_export', {
      amount: Math.round(totals.total),
      export_type: clean ? 'clean' : 'watermarked',
      tool,
    })
  }

  const startCleanExport = () => {
    trackEvent('clean_export_intent', {
      amount: Math.round(totals.total),
      tool,
    })
  }

  return (
    <>
      <section className="hero tool-hero">
        <div className="hero-copy">
          <h1>{copy.heading}</h1>
          <p>
            Fill in the details, autosave the draft, and generate a clean PDF.
            Free users can export now; Pro payments will remove future
            watermarks, store history, and unlock templates.
          </p>
        </div>
        <RevenuePanel />
      </section>

      <section className="tool-layout" id="tool">
        <form className="invoice-form">
          <ToolSwitch />
          <div className="section-heading">
            <div>
              <span>{copy.documentLabel} details</span>
              <small>
                Draft autosaves locally. Free PDFs include a BizFormFlow footer.
              </small>
            </div>
            <div className="button-row">
              <button type="button" onClick={resetDraft}>
                <RotateCcw size={16} />
                Reset
              </button>
              <button type="button" onClick={() => exportPdf(false)}>
                <Download size={16} />
                Free PDF
              </button>
              <button type="button" onClick={() => exportPdf(true)}>
                <Sparkles size={16} />
                {cleanCredits > 0 ? `Clean PDF (${cleanCredits})` : 'Buy clean PDF'}
              </button>
            </div>
          </div>

          <div className="field-grid three">
            <label>
              {copy.documentNumber}
              <input
                value={document.documentNumber}
                onChange={(event) =>
                  updateDocument('documentNumber', event.target.value)
                }
              />
            </label>
            <label>
              Issue date
              <input
                type="date"
                value={document.issueDate}
                onChange={(event) =>
                  updateDocument('issueDate', event.target.value)
                }
              />
            </label>
            <label>
              {copy.dueLabel}
              <input
                type="date"
                value={document.dueDate}
                onChange={(event) =>
                  updateDocument('dueDate', event.target.value)
                }
              />
            </label>
          </div>

          <div className="field-grid">
            <PartyFields
              legend="Your business"
              nameLabel="Business name"
              nameValue={document.businessName}
              emailValue={document.businessEmail}
              addressValue={document.businessAddress}
              onAddressChange={(value) => updateDocument('businessAddress', value)}
              onEmailChange={(value) => updateDocument('businessEmail', value)}
              onNameChange={(value) => updateDocument('businessName', value)}
            />
            <PartyFields
              legend="Client"
              nameLabel="Client name"
              nameValue={document.clientName}
              emailValue={document.clientEmail}
              addressValue={document.clientAddress}
              onAddressChange={(value) => updateDocument('clientAddress', value)}
              onEmailChange={(value) => updateDocument('clientEmail', value)}
              onNameChange={(value) => updateDocument('clientName', value)}
            />
          </div>

          <div className="line-items">
            <div className="section-heading compact">
              <span>Line items</span>
              <button type="button" onClick={addItem}>
                <Plus size={16} />
                Add item
              </button>
            </div>

            {items.map((item) => (
              <div className="line-item" key={item.id}>
                <label className="description">
                  Description
                  <input
                    value={item.description}
                    onChange={(event) =>
                      updateItem(item.id, 'description', event.target.value)
                    }
                  />
                </label>
                <label>
                  Qty
                  <input
                    min="0"
                    type="number"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(
                        item.id,
                        'quantity',
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  Rate
                  <input
                    min="0"
                    type="number"
                    value={item.rate}
                    onChange={(event) =>
                      updateItem(item.id, 'rate', Number(event.target.value))
                    }
                  />
                </label>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Remove line item"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>

          <div className="field-grid three">
            <label>
              Discount
              <input
                min="0"
                type="number"
                value={document.discount}
                onChange={(event) =>
                  updateDocument('discount', Number(event.target.value))
                }
              />
            </label>
            <label>
              Tax rate %
              <input
                min="0"
                type="number"
                value={document.taxRate}
                onChange={(event) =>
                  updateDocument('taxRate', Number(event.target.value))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                className="notes-input"
                value={document.notes}
                onChange={(event) => updateDocument('notes', event.target.value)}
              />
            </label>
          </div>

          <div className="monetization-strip">
            <div className="ad-unit">Partner or ad space</div>
            <Link to="/pricing" onClick={startCleanExport}>
              Remove watermark with paid export
            </Link>
          </div>
        </form>

        <aside className="invoice-preview" aria-label="Document preview">
          <DocumentPreview
            copy={copy}
            document={document}
            items={items}
            totals={totals}
          />
        </aside>
      </section>
      <DocumentSeoSection content={documentSeoContent[tool]} title={copy.documentLabel} />
      <SeoSection />
    </>
  )
}

function ToolSwitch() {
  return (
    <div className="tool-tabs" aria-label="Document type">
      <NavLink to="/invoice-generator">Invoice generator</NavLink>
      <NavLink to="/quote-generator">Quote generator</NavLink>
      <NavLink to="/receipt-maker">Receipt maker</NavLink>
    </div>
  )
}

function PartyFields({
  addressValue,
  emailValue,
  legend,
  nameLabel,
  nameValue,
  onAddressChange,
  onEmailChange,
  onNameChange,
}: {
  addressValue: string
  emailValue: string
  legend: string
  nameLabel: string
  nameValue: string
  onAddressChange: (value: string) => void
  onEmailChange: (value: string) => void
  onNameChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <label>
        {nameLabel}
        <input value={nameValue} onChange={(event) => onNameChange(event.target.value)} />
      </label>
      <label>
        Email
        <input
          type="email"
          value={emailValue}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </label>
      <label>
        Address
        <textarea
          value={addressValue}
          onChange={(event) => onAddressChange(event.target.value)}
        />
      </label>
    </fieldset>
  )
}

function DocumentPreview({
  copy,
  document,
  items,
  totals,
}: {
  copy: ReturnType<typeof getToolCopy>
  document: BusinessDocument
  items: LineItem[]
  totals: {
    discount: number
    subtotal: number
    tax: number
    total: number
  }
}) {
  return (
    <div className="invoice-paper">
      <div className="invoice-head">
        <div>
          <span>{copy.documentLabel}</span>
          <h2>{document.documentNumber}</h2>
        </div>
        <strong>{document.businessName}</strong>
      </div>

      <div className="invoice-meta">
        <div>
          <span>Issue date</span>
          <strong>{displayDate(document.issueDate)}</strong>
        </div>
        <div>
          <span>{copy.dueLabel}</span>
          <strong>{displayDate(document.dueDate)}</strong>
        </div>
      </div>

      <div className="invoice-parties">
        <div>
          <span>From</span>
          <strong>{document.businessName}</strong>
          <p>{document.businessEmail}</p>
          <p>{document.businessAddress}</p>
        </div>
        <div>
          <span>Bill to</span>
          <strong>{document.clientName}</strong>
          <p>{document.clientEmail}</p>
          <p>{document.clientAddress}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{currency.format(item.rate)}</td>
              <td>{currency.format(item.quantity * item.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <div>
          <span>Subtotal</span>
          <strong>{currency.format(totals.subtotal)}</strong>
        </div>
        <div>
          <span>Discount</span>
          <strong>-{currency.format(totals.discount)}</strong>
        </div>
        <div>
          <span>Tax</span>
          <strong>{currency.format(totals.tax)}</strong>
        </div>
        <div className="grand-total">
          <span>{copy.totalLabel}</span>
          <strong>{currency.format(totals.total)}</strong>
        </div>
      </div>

      <p className="invoice-notes">{document.notes}</p>
    </div>
  )
}

function DocumentSeoSection({
  content,
  title,
}: {
  content: (typeof documentSeoContent)[ToolType]
  title: string
}) {
  return (
    <section className="content-section">
      <div className="content-intro">
        <h2>How to use this {title.toLowerCase()} tool</h2>
        <p>{content.purpose}</p>
        <p>{content.who}</p>
      </div>
      <div className="content-grid">
        <article>
          <h3>Steps</h3>
          <ol>
            {content.howTo.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
        <article>
          <h3>Common mistakes</h3>
          <ul>
            {content.commonMistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </article>
      </div>
      <FaqList faqs={content.faqs} />
      <RelatedLinks links={content.related} />
    </section>
  )
}

function BreakEvenCalculator() {
  const [fixedCosts, setFixedCosts] = useState(5000)
  const [variableCost, setVariableCost] = useState(18)
  const [sellingPrice, setSellingPrice] = useState(45)
  const [expectedUnits, setExpectedUnits] = useState(250)

  const result = useMemo(() => {
    const contribution = sellingPrice - variableCost
    const breakEvenUnits =
      contribution > 0 ? Math.ceil(fixedCosts / contribution) : 0
    const breakEvenRevenue = breakEvenUnits * sellingPrice
    const expectedRevenue = expectedUnits * sellingPrice
    const expectedVariableCosts = expectedUnits * variableCost
    const expectedProfit = expectedRevenue - expectedVariableCosts - fixedCosts

    return {
      breakEvenRevenue,
      breakEvenUnits,
      contribution,
      expectedProfit,
    }
  }, [expectedUnits, fixedCosts, sellingPrice, variableCost])

  return (
    <CalculatorPage
      description="Find the sales volume and revenue needed to cover fixed costs, variable costs, and expected sales."
      seoKey="breakEven"
      title="Break-even calculator"
    >
      <CalculatorFields>
        <NumberField
          label="Fixed costs"
          value={fixedCosts}
          onChange={setFixedCosts}
        />
        <NumberField
          label="Variable cost/unit"
          value={variableCost}
          onChange={setVariableCost}
        />
        <NumberField
          label="Selling price/unit"
          value={sellingPrice}
          onChange={setSellingPrice}
        />
        <NumberField
          label="Expected units"
          value={expectedUnits}
          onChange={setExpectedUnits}
        />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Break-even units', result.breakEvenUnits.toLocaleString()],
          ['Break-even revenue', currency.format(result.breakEvenRevenue)],
          ['Contribution/unit', currency.format(result.contribution)],
          ['Expected profit', currency.format(result.expectedProfit)],
        ]}
      />
    </CalculatorPage>
  )
}

function ProfitMarginCalculator() {
  const [cost, setCost] = useState(25)
  const [price, setPrice] = useState(60)
  const [fees, setFees] = useState(3)

  const result = useMemo(() => {
    const profit = price - cost - fees
    const margin = price > 0 ? (profit / price) * 100 : 0
    const markup = cost > 0 ? (profit / cost) * 100 : 0
    return { margin, markup, profit }
  }, [cost, fees, price])

  return (
    <CalculatorPage
      description="Check product or service profitability after costs and fees."
      seoKey="margin"
      title="Profit margin calculator"
    >
      <CalculatorFields>
        <NumberField label="Cost" value={cost} onChange={setCost} />
        <NumberField label="Selling price" value={price} onChange={setPrice} />
        <NumberField label="Fees" value={fees} onChange={setFees} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Profit', currency.format(result.profit)],
          ['Margin', `${result.margin.toFixed(1)}%`],
          ['Markup', `${result.markup.toFixed(1)}%`],
        ]}
      />
    </CalculatorPage>
  )
}

function FreelanceRateCalculator() {
  const [targetIncome, setTargetIncome] = useState(80000)
  const [expenses, setExpenses] = useState(12000)
  const [taxRate, setTaxRate] = useState(25)
  const [billableHours, setBillableHours] = useState(1200)

  const result = useMemo(() => {
    const needed = (targetIncome + expenses) / (1 - taxRate / 100)
    const hourly = billableHours > 0 ? needed / billableHours : 0
    return {
      annual: needed,
      daily: hourly * 8,
      hourly,
      monthly: needed / 12,
    }
  }, [billableHours, expenses, targetIncome, taxRate])

  return (
    <CalculatorPage
      description="Estimate what to charge to hit an annual income goal."
      seoKey="freelance"
      title="Freelance rate calculator"
    >
      <CalculatorFields>
        <NumberField label="Target income" value={targetIncome} onChange={setTargetIncome} />
        <NumberField label="Annual expenses" value={expenses} onChange={setExpenses} />
        <NumberField label="Tax rate %" value={taxRate} onChange={setTaxRate} />
        <NumberField
          label="Billable hours/year"
          value={billableHours}
          onChange={setBillableHours}
        />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Hourly rate', currency.format(result.hourly)],
          ['Day rate', currency.format(result.daily)],
          ['Monthly target', currency.format(result.monthly)],
          ['Annual gross need', currency.format(result.annual)],
        ]}
      />
    </CalculatorPage>
  )
}

const paymentProcessors = {
  paypal: { fixed: 0.49, label: 'PayPal online', percent: 3.49 },
  stripe: { fixed: 0.3, label: 'Stripe online', percent: 2.9 },
  square: { fixed: 0.3, label: 'Square online', percent: 2.9 },
  custom: { fixed: 0, label: 'Custom fees', percent: 0 },
}

function PaymentFeeCalculator() {
  const [processor, setProcessor] =
    useState<keyof typeof paymentProcessors>('paypal')
  const [chargeAmount, setChargeAmount] = useState(100)
  const [targetNet, setTargetNet] = useState(100)
  const [customPercent, setCustomPercent] = useState(3)
  const [customFixed, setCustomFixed] = useState(0.3)

  const selected = paymentProcessors[processor]
  const percentFee = processor === 'custom' ? customPercent : selected.percent
  const fixedFee = processor === 'custom' ? customFixed : selected.fixed

  const result = useMemo(() => {
    const percentRate = Math.max(percentFee, 0) / 100
    const fixed = Math.max(fixedFee, 0)
    const amount = Math.max(chargeAmount, 0)
    const fee = amount * percentRate + fixed
    const netReceived = Math.max(amount - fee, 0)
    const grossForTarget =
      percentRate < 1 ? (Math.max(targetNet, 0) + fixed) / (1 - percentRate) : 0

    return {
      fee,
      grossForTarget,
      netReceived,
      percentRate,
    }
  }, [chargeAmount, fixedFee, percentFee, targetNet])

  return (
    <CalculatorPage
      description="Estimate payment processor fees, net received, and the gross amount to charge for a target payout."
      seoKey="fees"
      title="Payment fee calculator"
    >
      <CalculatorFields>
        <SelectField
          label="Processor"
          onChange={(value) =>
            setProcessor(value as keyof typeof paymentProcessors)
          }
          options={Object.entries(paymentProcessors).map(([value, config]) => [
            value,
            config.label,
          ])}
          value={processor}
        />
        <NumberField
          label="Amount charged"
          value={chargeAmount}
          onChange={setChargeAmount}
        />
        <NumberField
          label="Target net"
          value={targetNet}
          onChange={setTargetNet}
        />
        <NumberField
          label="Fee %"
          value={percentFee}
          onChange={setCustomPercent}
          disabled={processor !== 'custom'}
        />
        <NumberField
          label="Fixed fee"
          value={fixedFee}
          onChange={setCustomFixed}
          disabled={processor !== 'custom'}
        />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Estimated fee', currency.format(result.fee)],
          ['Net received', currency.format(result.netReceived)],
          ['Charge for target', currency.format(result.grossForTarget)],
          ['Effective fee rate', `${(result.fee / Math.max(chargeAmount, 1) * 100).toFixed(2)}%`],
        ]}
      />
    </CalculatorPage>
  )
}

function SalesTaxCalculator() {
  const [subtotal, setSubtotal] = useState(100)
  const [taxRate, setTaxRate] = useState(8)
  const [taxIncludedTotal, setTaxIncludedTotal] = useState(108)

  const result = useMemo(() => {
    const rate = Math.max(taxRate, 0) / 100
    const taxableSubtotal = Math.max(subtotal, 0)
    const taxAmount = taxableSubtotal * rate
    const totalWithTax = taxableSubtotal + taxAmount
    const includedTotal = Math.max(taxIncludedTotal, 0)
    const reverseSubtotal = rate > 0 ? includedTotal / (1 + rate) : includedTotal
    const includedTax = includedTotal - reverseSubtotal

    return {
      includedTax,
      reverseSubtotal,
      taxAmount,
      totalWithTax,
    }
  }, [subtotal, taxIncludedTotal, taxRate])

  return (
    <CalculatorPage
      description="Calculate sales tax, total with tax, and the pre-tax amount inside a tax-included price."
      seoKey="salesTax"
      title="Sales tax calculator"
    >
      <CalculatorFields>
        <NumberField label="Subtotal" value={subtotal} onChange={setSubtotal} />
        <NumberField label="Sales tax %" value={taxRate} onChange={setTaxRate} />
        <NumberField
          label="Tax-included total"
          value={taxIncludedTotal}
          onChange={setTaxIncludedTotal}
        />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Tax amount', currency.format(result.taxAmount)],
          ['Total with tax', currency.format(result.totalWithTax)],
          ['Pre-tax from total', currency.format(result.reverseSubtotal)],
          ['Included tax', currency.format(result.includedTax)],
        ]}
      />
    </CalculatorPage>
  )
}

function DiscountCalculator() {
  const [price, setPrice] = useState(120)
  const [discountRate, setDiscountRate] = useState(20)
  const [quantity, setQuantity] = useState(2)
  const [taxRate, setTaxRate] = useState(8)

  const result = useMemo(() => {
    const originalTotal = price * quantity
    const discountAmount = originalTotal * (discountRate / 100)
    const discountedSubtotal = Math.max(originalTotal - discountAmount, 0)
    const tax = discountedSubtotal * (taxRate / 100)
    return { discountAmount, discountedSubtotal, finalTotal: discountedSubtotal + tax, tax }
  }, [discountRate, price, quantity, taxRate])

  return (
    <CalculatorPage
      description="Calculate sale price, discount amount, tax, and final total from price, quantity, and discount rate."
      seoKey="discount"
      title="Discount calculator"
    >
      <CalculatorFields>
        <NumberField label="Original price" value={price} onChange={setPrice} />
        <NumberField label="Discount %" value={discountRate} onChange={setDiscountRate} />
        <NumberField label="Quantity" value={quantity} onChange={setQuantity} />
        <NumberField label="Tax %" value={taxRate} onChange={setTaxRate} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Discount amount', currency.format(result.discountAmount)],
          ['Sale subtotal', currency.format(result.discountedSubtotal)],
          ['Tax', currency.format(result.tax)],
          ['Final total', currency.format(result.finalTotal)],
        ]}
      />
    </CalculatorPage>
  )
}

function MarkupCalculator() {
  const [cost, setCost] = useState(50)
  const [markupRate, setMarkupRate] = useState(40)
  const [fees, setFees] = useState(3)

  const result = useMemo(() => {
    const sellingPrice = cost * (1 + markupRate / 100) + fees
    const profit = sellingPrice - cost - fees
    const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0
    return { margin, profit, sellingPrice }
  }, [cost, fees, markupRate])

  return (
    <CalculatorPage
      description="Turn cost into selling price and compare markup with final profit margin."
      seoKey="markup"
      title="Markup calculator"
    >
      <CalculatorFields>
        <NumberField label="Cost" value={cost} onChange={setCost} />
        <NumberField label="Markup %" value={markupRate} onChange={setMarkupRate} />
        <NumberField label="Extra fees" value={fees} onChange={setFees} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Selling price', currency.format(result.sellingPrice)],
          ['Profit', currency.format(result.profit)],
          ['Margin', `${result.margin.toFixed(1)}%`],
          ['Markup', `${markupRate.toFixed(1)}%`],
        ]}
      />
    </CalculatorPage>
  )
}

function RoiCalculator() {
  const [investment, setInvestment] = useState(1000)
  const [returnValue, setReturnValue] = useState(1600)
  const [extraCosts, setExtraCosts] = useState(150)

  const result = useMemo(() => {
    const totalCost = investment + extraCosts
    const netGain = returnValue - totalCost
    const roi = totalCost > 0 ? (netGain / totalCost) * 100 : 0
    return { netGain, roi, totalCost }
  }, [extraCosts, investment, returnValue])

  return (
    <CalculatorPage
      description="Calculate net gain and return on investment for projects, campaigns, or business purchases."
      seoKey="roi"
      title="ROI calculator"
    >
      <CalculatorFields>
        <NumberField label="Investment" value={investment} onChange={setInvestment} />
        <NumberField label="Return value" value={returnValue} onChange={setReturnValue} />
        <NumberField label="Extra costs" value={extraCosts} onChange={setExtraCosts} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Total cost', currency.format(result.totalCost)],
          ['Net gain', currency.format(result.netGain)],
          ['ROI', `${result.roi.toFixed(1)}%`],
        ]}
      />
    </CalculatorPage>
  )
}

function CashFlowCalculator() {
  const [startingCash, setStartingCash] = useState(10000)
  const [cashIn, setCashIn] = useState(6500)
  const [cashOut, setCashOut] = useState(4200)
  const [monthlyBurn, setMonthlyBurn] = useState(3000)

  const result = useMemo(() => {
    const netCashFlow = cashIn - cashOut
    const endingCash = startingCash + netCashFlow
    const runway = monthlyBurn > 0 ? endingCash / monthlyBurn : 0
    return { endingCash, netCashFlow, runway }
  }, [cashIn, cashOut, monthlyBurn, startingCash])

  return (
    <CalculatorPage
      description="Estimate net cash flow, ending cash, and runway from cash coming in and going out."
      seoKey="cashFlow"
      title="Cash flow calculator"
    >
      <CalculatorFields>
        <NumberField label="Starting cash" value={startingCash} onChange={setStartingCash} />
        <NumberField label="Cash in" value={cashIn} onChange={setCashIn} />
        <NumberField label="Cash out" value={cashOut} onChange={setCashOut} />
        <NumberField label="Monthly burn" value={monthlyBurn} onChange={setMonthlyBurn} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Net cash flow', currency.format(result.netCashFlow)],
          ['Ending cash', currency.format(result.endingCash)],
          ['Runway', `${result.runway.toFixed(1)} months`],
        ]}
      />
    </CalculatorPage>
  )
}

function LoanPaymentCalculator() {
  const [principal, setPrincipal] = useState(25000)
  const [annualRate, setAnnualRate] = useState(8)
  const [years, setYears] = useState(5)

  const result = useMemo(() => {
    const months = Math.max(years * 12, 1)
    const monthlyRate = annualRate / 100 / 12
    const monthlyPayment =
      monthlyRate > 0
        ? (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months)
        : principal / months
    const totalPaid = monthlyPayment * months
    return { monthlyPayment, totalInterest: totalPaid - principal, totalPaid }
  }, [annualRate, principal, years])

  return (
    <CalculatorPage
      description="Estimate monthly payment, total paid, and total interest for a business loan."
      seoKey="loan"
      title="Loan payment calculator"
    >
      <CalculatorFields>
        <NumberField label="Loan amount" value={principal} onChange={setPrincipal} />
        <NumberField label="Annual rate %" value={annualRate} onChange={setAnnualRate} />
        <NumberField label="Term years" value={years} onChange={setYears} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Monthly payment', currency.format(result.monthlyPayment)],
          ['Total paid', currency.format(result.totalPaid)],
          ['Total interest', currency.format(result.totalInterest)],
        ]}
      />
    </CalculatorPage>
  )
}

function LateFeeCalculator() {
  const [invoiceAmount, setInvoiceAmount] = useState(1200)
  const [daysLate, setDaysLate] = useState(14)
  const [percentFee, setPercentFee] = useState(3)
  const [fixedFee, setFixedFee] = useState(25)
  const [dailyFee, setDailyFee] = useState(2)

  const result = useMemo(() => {
    const lateFee = invoiceAmount * (percentFee / 100) + fixedFee + dailyFee * daysLate
    return { lateFee, totalDue: invoiceAmount + lateFee }
  }, [dailyFee, daysLate, fixedFee, invoiceAmount, percentFee])

  return (
    <CalculatorPage
      description="Estimate late payment charges and total amount due for overdue invoices."
      seoKey="lateFee"
      title="Late fee calculator"
    >
      <CalculatorFields>
        <NumberField label="Invoice amount" value={invoiceAmount} onChange={setInvoiceAmount} />
        <NumberField label="Days late" value={daysLate} onChange={setDaysLate} />
        <NumberField label="Late fee %" value={percentFee} onChange={setPercentFee} />
        <NumberField label="Fixed fee" value={fixedFee} onChange={setFixedFee} />
        <NumberField label="Daily fee" value={dailyFee} onChange={setDailyFee} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Late fee', currency.format(result.lateFee)],
          ['Total due', currency.format(result.totalDue)],
        ]}
      />
    </CalculatorPage>
  )
}

function Net30DueDateCalculator() {
  const [invoiceDate, setInvoiceDate] = useState(formatDate(today))
  const [netDays, setNetDays] = useState(30)

  const result = useMemo(() => {
    const due = new Date(`${invoiceDate}T00:00:00`)
    due.setDate(due.getDate() + netDays)
    const daysFromToday = Math.ceil(
      (due.getTime() - new Date(formatDate(today)).getTime()) / 86400000,
    )
    return { daysFromToday, dueDate: formatDate(due) }
  }, [invoiceDate, netDays])

  return (
    <CalculatorPage
      description="Calculate invoice due dates for Net 7, Net 15, Net 30, Net 45, Net 60, or custom payment terms."
      seoKey="net30"
      title="Net 30 due date calculator"
    >
      <CalculatorFields>
        <DateField label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
        <NumberField label="Net days" value={netDays} onChange={setNetDays} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Due date', displayDate(result.dueDate)],
          ['Days from today', `${result.daysFromToday}`],
        ]}
      />
    </CalculatorPage>
  )
}

function HourlyToSalaryCalculator() {
  const [hourlyRate, setHourlyRate] = useState(35)
  const [hoursPerWeek, setHoursPerWeek] = useState(40)
  const [weeksPerYear, setWeeksPerYear] = useState(52)

  const result = useMemo(() => {
    const weekly = hourlyRate * hoursPerWeek
    const annual = weekly * weeksPerYear
    return { annual, monthly: annual / 12, weekly }
  }, [hourlyRate, hoursPerWeek, weeksPerYear])

  return (
    <CalculatorPage
      description="Convert hourly pay into weekly, monthly, and annual income estimates."
      seoKey="hourlySalary"
      title="Hourly to salary calculator"
    >
      <CalculatorFields>
        <NumberField label="Hourly rate" value={hourlyRate} onChange={setHourlyRate} />
        <NumberField label="Hours/week" value={hoursPerWeek} onChange={setHoursPerWeek} />
        <NumberField label="Weeks/year" value={weeksPerYear} onChange={setWeeksPerYear} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Weekly pay', currency.format(result.weekly)],
          ['Monthly pay', currency.format(result.monthly)],
          ['Annual pay', currency.format(result.annual)],
        ]}
      />
    </CalculatorPage>
  )
}

function ContractorPayCalculator() {
  const [hourlyRate, setHourlyRate] = useState(65)
  const [hoursWorked, setHoursWorked] = useState(32)
  const [expenses, setExpenses] = useState(120)
  const [feeRate, setFeeRate] = useState(3)

  const result = useMemo(() => {
    const grossPay = hourlyRate * hoursWorked + expenses
    const platformFee = grossPay * (feeRate / 100)
    return { grossPay, netPay: grossPay - platformFee, platformFee }
  }, [expenses, feeRate, hourlyRate, hoursWorked])

  return (
    <CalculatorPage
      description="Estimate contractor gross pay, fees, expenses, and net pay."
      seoKey="contractorPay"
      title="Contractor pay calculator"
    >
      <CalculatorFields>
        <NumberField label="Hourly rate" value={hourlyRate} onChange={setHourlyRate} />
        <NumberField label="Hours worked" value={hoursWorked} onChange={setHoursWorked} />
        <NumberField label="Expenses" value={expenses} onChange={setExpenses} />
        <NumberField label="Fee %" value={feeRate} onChange={setFeeRate} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Gross pay', currency.format(result.grossPay)],
          ['Platform fee', currency.format(result.platformFee)],
          ['Net pay', currency.format(result.netPay)],
        ]}
      />
    </CalculatorPage>
  )
}

function VatCalculator() {
  const [netAmount, setNetAmount] = useState(100)
  const [vatRate, setVatRate] = useState(20)
  const [grossAmount, setGrossAmount] = useState(120)

  const result = useMemo(() => {
    const rate = vatRate / 100
    const vatAmount = netAmount * rate
    const grossTotal = netAmount + vatAmount
    const netFromGross = rate > 0 ? grossAmount / (1 + rate) : grossAmount
    return { grossTotal, netFromGross, vatAmount, vatFromGross: grossAmount - netFromGross }
  }, [grossAmount, netAmount, vatRate])

  return (
    <CalculatorPage
      description="Calculate VAT, gross total, and VAT-exclusive values from net or VAT-included amounts."
      seoKey="vat"
      title="VAT calculator"
    >
      <CalculatorFields>
        <NumberField label="Net amount" value={netAmount} onChange={setNetAmount} />
        <NumberField label="VAT %" value={vatRate} onChange={setVatRate} />
        <NumberField label="VAT-included total" value={grossAmount} onChange={setGrossAmount} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['VAT amount', currency.format(result.vatAmount)],
          ['Gross total', currency.format(result.grossTotal)],
          ['Net from gross', currency.format(result.netFromGross)],
          ['VAT in gross', currency.format(result.vatFromGross)],
        ]}
      />
    </CalculatorPage>
  )
}

function ServiceChargeCalculator() {
  const [billAmount, setBillAmount] = useState(250)
  const [serviceRate, setServiceRate] = useState(18)
  const [taxRate, setTaxRate] = useState(8)

  const result = useMemo(() => {
    const serviceCharge = billAmount * (serviceRate / 100)
    const taxableAmount = billAmount + serviceCharge
    const tax = taxableAmount * (taxRate / 100)
    return { serviceCharge, tax, total: taxableAmount + tax }
  }, [billAmount, serviceRate, taxRate])

  return (
    <CalculatorPage
      description="Calculate service charge, tax, and final total for bills, invoices, events, and service transactions."
      seoKey="serviceCharge"
      title="Service charge calculator"
    >
      <CalculatorFields>
        <NumberField label="Bill amount" value={billAmount} onChange={setBillAmount} />
        <NumberField label="Service charge %" value={serviceRate} onChange={setServiceRate} />
        <NumberField label="Tax %" value={taxRate} onChange={setTaxRate} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Service charge', currency.format(result.serviceCharge)],
          ['Tax', currency.format(result.tax)],
          ['Final total', currency.format(result.total)],
        ]}
      />
    </CalculatorPage>
  )
}

function PurchaseOrderGenerator() {
  const [supplier, setSupplier] = useState('Office Supply Co.')
  const [poNumber, setPoNumber] = useState('PO-0001')
  const [quantity, setQuantity] = useState(25)
  const [unitCost, setUnitCost] = useState(18)
  const [shipping, setShipping] = useState(35)
  const [taxRate, setTaxRate] = useState(8)

  const result = useMemo(() => {
    const subtotal = quantity * unitCost
    const tax = (subtotal + shipping) * (taxRate / 100)
    return { subtotal, tax, total: subtotal + shipping + tax }
  }, [quantity, shipping, taxRate, unitCost])

  return (
    <CalculatorPage
      description="Draft a simple purchase order total with supplier, quantity, unit cost, shipping, and tax."
      seoKey="purchaseOrder"
      title="Purchase order generator"
    >
      <CalculatorFields>
        <TextField label="Supplier" value={supplier} onChange={setSupplier} />
        <TextField label="PO number" value={poNumber} onChange={setPoNumber} />
        <NumberField label="Quantity" value={quantity} onChange={setQuantity} />
        <NumberField label="Unit cost" value={unitCost} onChange={setUnitCost} />
        <NumberField label="Shipping" value={shipping} onChange={setShipping} />
        <NumberField label="Tax %" value={taxRate} onChange={setTaxRate} />
      </CalculatorFields>
      <ResultGrid
        results={[
          ['Supplier', supplier],
          ['PO number', poNumber],
          ['Subtotal', currency.format(result.subtotal)],
          ['Order total', currency.format(result.total)],
        ]}
      />
    </CalculatorPage>
  )
}

function CalculatorPage({
  children,
  description,
  title,
  seoKey,
}: {
  children: React.ReactNode
  description: string
  seoKey: keyof typeof calculatorSeoContent
  title: string
}) {
  const content = calculatorSeoContent[seoKey]

  return (
    <>
      <section className="hero calculator-hero">
        <div className="hero-copy">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <RevenuePanel />
      </section>
      <section className="calculator-panel">{children}</section>
      <CalculatorSeoSection content={content} title={title} />
      <SeoSection />
    </>
  )
}

function CalculatorSeoSection({
  content,
  title,
}: {
  content: (typeof calculatorSeoContent)[keyof typeof calculatorSeoContent]
  title: string
}) {
  return (
    <section className="content-section">
      <div className="content-intro">
        <h2>How to use the {title.toLowerCase()}</h2>
        <p>{content.purpose}</p>
      </div>
      <div className="content-grid">
        <article>
          <h3>Steps</h3>
          <ol>
            {content.howTo.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
        <article>
          <h3>Why it matters</h3>
          <p>
            Better pricing decisions help you avoid undercharging, protect cash
            flow, and understand whether a project or product is worth taking on.
          </p>
        </article>
      </div>
      <FaqList faqs={content.faqs} />
      <RelatedLinks links={content.related} />
    </section>
  )
}

function FaqList({ faqs }: { faqs: Array<[string, string]> }) {
  return (
    <div className="faq-grid">
      {faqs.map(([question, answer]) => (
        <details key={question}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  )
}

function RelatedLinks({ links }: { links: Array<[string, string]> }) {
  return (
    <div className="related-tools">
      <h3>Related tools</h3>
      <div>
        {links.map(([label, href]) => (
          <Link key={href} to={href}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function CalculatorFields({ children }: { children: React.ReactNode }) {
  return <div className="calculator-fields">{children}</div>
}

function NumberField({
  disabled = false,
  label,
  onChange,
  value,
}: {
  disabled?: boolean
  label: string
  onChange: (value: number) => void
  value: number
}) {
  return (
    <label>
      {label}
      <input
        min="0"
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label>
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<[string, string]>
  value: string
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function ResultGrid({ results }: { results: Array<[string, string]> }) {
  return (
    <div className="result-grid">
      {results.map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  )
}

function PricingPage() {
  useEffect(() => {
    trackEvent('pricing_view', { source: 'pricing_page' })
  }, [])

  return (
    <section className="pricing-page">
      <div>
        <h1>Simple pricing for the first revenue tests.</h1>
        <p>
          Free exports include a small BizFormFlow footer. Paid single exports
          unlock clean PDFs, while Pro plans will add saved history, templates,
          and future business workflows after subscription checkout is activated.
        </p>
      </div>
      <div className="pricing-grid">
        <PricingCard
          cta="Start single export checkout"
          description="One clean PDF export for an invoice, quote, or receipt without the BizFormFlow footer."
          name="Single export"
          price="$3"
          product="single_export"
        />
        <PricingCard
          cta="Pro plan not yet activated"
          description="Clean exports, saved document history, reusable templates, and unlimited monthly exports."
          name="Pro monthly"
          price="$9"
          product="pro_monthly"
        />
        <PricingCard
          cta="Business plan not yet activated"
          description="Branding, reusable clients, bulk exports, team workflows, and higher-volume document tools."
          name="Business"
          price="$19"
          product="business_monthly"
        />
      </div>
    </section>
  )
}

function PricingCard({
  cta,
  description,
  name,
  price,
  product,
}: {
  cta: string
  description: string
  name: string
  price: string
  product: 'business_monthly' | 'pro_monthly' | 'single_export'
}) {
  const [status, setStatus] = useState('')
  const [debugSteps, setDebugSteps] = useState<string[]>([])
  const isSingleExport = product === 'single_export'
  const showCheckoutDebug =
    new URLSearchParams(window.location.search).get('debug') === '1'
  const addDebugStep = useCallback((step: string) => {
    setDebugSteps((current) => [
      `${new Date().toLocaleTimeString()} - ${step}`,
      ...current,
    ])
  }, [])

  return (
    <article className="pricing-card">
      <h2>{name}</h2>
      <strong>{price}</strong>
      <p>{description}</p>
      {isSingleExport ? (
        <>
          <PayPalCheckoutButton
            amount="3.00"
            description="BizFormFlow clean PDF export"
            onDebug={addDebugStep}
            onError={(message) => {
              setStatus(message)
              addDebugStep(message)
            }}
            onSuccess={(orderId) => {
              addCleanExportCredit()
              setStatus(
                'Payment approved. One clean export credit is ready on this browser.',
              )
              addDebugStep(`Credit added from order ${orderId}`)
              trackEvent('payment_success', {
                order_id: orderId,
                plan: name,
                provider: 'paypal',
              })
            }}
            planName={name}
          />
          {status ? <p className="payment-status">{status}</p> : null}
          {showCheckoutDebug && debugSteps.length ? (
            <div className="payment-debug">
              <strong>Checkout log</strong>
              <ul>
                {debugSteps.slice(0, 6).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <button
          className="unavailable-pay"
          disabled
          type="button"
          title={`${name} checkout is not active yet`}
        >
          {cta}
        </button>
      )}
      <button
        className="secondary-pay unavailable-pay"
        disabled
        type="button"
        title="Solana USDC checkout is not active yet"
      >
        Solana USDC not yet activated
      </button>
    </article>
  )
}

function PayPalCheckoutButton({
  amount,
  description,
  onDebug,
  onError,
  onSuccess,
  planName,
}: {
  amount: string
  description: string
  onDebug: (step: string) => void
  onError: (message: string) => void
  onSuccess: (orderId: string) => void
  planName: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onDebugRef = useRef(onDebug)
  const onErrorRef = useRef(onError)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onDebugRef.current = onDebug
    onErrorRef.current = onError
    onSuccessRef.current = onSuccess
  }, [onDebug, onError, onSuccess])

  useEffect(() => {
    let cancelled = false
    const debug = (step: string) => onDebugRef.current(step)

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.paypal) {
          debug('PayPal SDK already loaded')
          resolve()
          return
        }

        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-bizformflow-paypal="true"]',
        )
        if (existing) {
          debug('Waiting for existing PayPal SDK script')
          existing.addEventListener(
            'load',
            () => {
              debug('Existing PayPal SDK loaded')
              resolve()
            },
            { once: true },
          )
          existing.addEventListener('error', reject, { once: true })
          return
        }

        const script = document.createElement('script')
        script.dataset.bizformflowPaypal = 'true'
        script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&intent=capture`
        debug('Loading PayPal SDK')
        script.addEventListener(
          'load',
          () => {
            debug('PayPal SDK loaded')
            resolve()
          },
          { once: true },
        )
        script.addEventListener('error', reject, { once: true })
        document.body.appendChild(script)
      })

    const renderButton = async () => {
      try {
        await loadScript()
        if (cancelled || !containerRef.current || !window.paypal) {
          debug('PayPal render cancelled or unavailable')
          return
        }

        containerRef.current.innerHTML = ''
        debug('Rendering PayPal button')
        await window.paypal
          .Buttons({
            createOrder: (_data, actions) => {
              debug('Creating PayPal order')
              trackEvent('checkout_start', {
                amount: Number(amount),
                plan: planName,
                provider: 'paypal',
              })
              void actions
              return fetch('/api/paypal-create-order', {
                method: 'POST',
              })
                .then(async (response) => {
                  const text = await response.text()
                  const data = text ? JSON.parse(text) : {}
                  if (!response.ok) {
                    throw new Error(
                      data.error ??
                        `Create order failed (${response.status}): ${text || 'empty response'}`,
                    )
                  }
                  debug(`Server created order ${data.id}`)
                  return data.id as string
                })
            },
            onApprove: async (data) => {
              debug('Payment approved by buyer, capturing order')
              try {
                const orderData = data as { orderID?: string }
                const response = await fetch('/api/paypal-capture-order', {
                  body: JSON.stringify({ orderId: orderData.orderID }),
                  headers: { 'Content-Type': 'application/json' },
                  method: 'POST',
                })
                const text = await response.text()
                const capture = text ? JSON.parse(text) : {}
                if (!response.ok) {
                  throw new Error(
                    capture.error ??
                      `Capture failed (${response.status}): ${text || 'empty response'}`,
                  )
                }
                debug(`Server captured order with status ${capture.status ?? 'unknown'}`)
                onSuccessRef.current(capture.id ?? orderData.orderID ?? 'sandbox-order')
              } catch (error) {
                const message = getErrorMessage(error)
                debug(`Capture failed: ${message}`)
                onErrorRef.current(`PayPal capture failed: ${message}`)
                trackEvent('payment_capture_error', {
                  plan: planName,
                  provider: 'paypal',
                })
              }
            },
            onError: (error) => {
              console.error(error)
              debug(`PayPal SDK error: ${getErrorMessage(error)}`)
              onErrorRef.current(
                'PayPal checkout could not be completed. Please try again.',
              )
              trackEvent('payment_error', {
                plan: planName,
                provider: 'paypal',
              })
            },
            style: {
              color: 'gold',
              label: 'pay',
              layout: 'vertical',
              shape: 'rect',
            },
          })
          .render(containerRef.current)
      } catch (error) {
        console.error(error)
        debug(`PayPal load/render failed: ${getErrorMessage(error)}`)
        onErrorRef.current(
          'PayPal checkout could not load. Check your connection or client ID.',
        )
      }
    }

    void renderButton()

    return () => {
      cancelled = true
    }
  }, [amount, description, planName])

  return <div className="paypal-button" ref={containerRef} />
}

function SeoSection() {
  return (
    <section className="seo-section" id="seo">
      <div>
        <h2>Small business document workflow</h2>
        <p>
          BizFormFlow groups related tools so a small business can estimate work,
          send billing documents, confirm payments, and check pricing without
          jumping between disconnected apps.
        </p>
      </div>
      <div className="seo-grid">
        <article>
          <h3>Free invoice generator</h3>
          <p>
            Create a payment request with client details, line items, tax,
            discounts, notes, and a downloadable PDF.
          </p>
        </article>
        <article>
          <h3>Free quote generator</h3>
          <p>
            Estimate work before a client approves it, then use the same details
            later when creating an invoice.
          </p>
        </article>
        <article>
          <h3>Pricing calculators</h3>
          <p>
            Check profit margins and freelance rates before sending a quote so
            every document starts from better numbers.
          </p>
        </article>
      </div>
    </section>
  )
}

function ToolPortfolio() {
  return (
    <section className="portfolio" id="portfolio">
      <div>
        <h2>Tools in the portfolio</h2>
        <p>
          Each tool gets free usage, SEO pages, ad inventory, and a paid upgrade
          path.
        </p>
      </div>
      <div className="tool-cards">
        <ToolCard icon={<FileText size={18} />} label="Invoice generator" to="/invoice-generator" />
        <ToolCard icon={<FileText size={18} />} label="Quote generator" to="/quote-generator" />
        <ToolCard icon={<ReceiptText size={18} />} label="Receipt maker" to="/receipt-maker" />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Break-even calculator"
          to="/break-even-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Cash flow calculator"
          to="/cash-flow-calculator"
        />
        <ToolCard
          icon={<BadgeDollarSign size={18} />}
          label="Contractor pay calculator"
          to="/contractor-pay-calculator"
        />
        <ToolCard
          icon={<BadgeDollarSign size={18} />}
          label="Discount calculator"
          to="/discount-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Profit margin calculator"
          to="/profit-margin-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Markup calculator"
          to="/markup-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="ROI calculator"
          to="/roi-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Loan payment calculator"
          to="/loan-payment-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Late fee calculator"
          to="/late-fee-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Net 30 due date calculator"
          to="/net-30-due-date-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Hourly to salary calculator"
          to="/hourly-to-salary-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Freelance rate calculator"
          to="/freelance-rate-calculator"
        />
        <ToolCard
          icon={<BadgeDollarSign size={18} />}
          label="Payment fee calculator"
          to="/payment-fee-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Sales tax calculator"
          to="/sales-tax-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="VAT calculator"
          to="/vat-calculator"
        />
        <ToolCard
          icon={<Calculator size={18} />}
          label="Service charge calculator"
          to="/service-charge-calculator"
        />
        <ToolCard
          icon={<ReceiptText size={18} />}
          label="Purchase order generator"
          to="/purchase-order-generator"
        />
      </div>
    </section>
  )
}

function ToolCard({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode
  label: string
  to: string
}) {
  return (
    <Link to={to}>
      {icon}
      <span>{label}</span>
    </Link>
  )
}

function PolicyPage({ type }: { type: 'privacy' | 'terms' }) {
  const isPrivacy = type === 'privacy'
  return (
    <section className="legal-page">
      <h1>{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
      <p>
        {isPrivacy
          ? 'BizFormFlow is designed to be useful without requiring an account. Drafts are currently stored in your browser, while analytics, payments, and future advertising may be handled by trusted third-party providers.'
          : 'BizFormFlow tools are productivity helpers for creating business documents and making basic pricing calculations. They are not legal, tax, accounting, or financial advice.'}
      </p>
      <div className="legal-grid">
        <article>
          <h2>{isPrivacy ? 'Local drafts and storage' : 'Tool accuracy'}</h2>
          <p>
            {isPrivacy
              ? 'Invoice, quote, and receipt drafts stay in local browser storage on the device you use. Clearing browser data may remove saved drafts.'
              : 'Generated documents and calculator outputs should be checked for tax, legal, billing, currency, and client-specific requirements before use.'}
          </p>
        </article>
        <article>
          <h2>{isPrivacy ? 'Ads and analytics' : 'Payments'}</h2>
          <p>
            {isPrivacy
              ? 'BizFormFlow uses Google Analytics to understand site usage. Advertising, including Google AdSense, and affiliate placements may be added later and may use cookies or similar technologies.'
              : 'Single clean PDF exports are processed through PayPal checkout. Payment information is handled by the payment provider, not stored directly by BizFormFlow.'}
          </p>
        </article>
        <article>
          <h2>{isPrivacy ? 'Contact information' : 'User responsibility'}</h2>
          <p>
            {isPrivacy
              ? `If you contact BizFormFlow at ${supportEmail}, we may use your email address and message only to respond to your request.`
              : 'You are responsible for confirming that names, addresses, totals, tax rates, dates, payment terms, and client details are correct.'}
          </p>
        </article>
        <article>
          <h2>{isPrivacy ? 'Payment providers' : 'Availability'}</h2>
          <p>
            {isPrivacy
              ? 'PayPal may process checkout data for paid exports. Solana USDC checkout is shown as unavailable until a production crypto payment flow is activated.'
              : 'The service may change as new tools, payment features, analytics, advertising integrations, and paid plans are added.'}
          </p>
        </article>
      </div>
    </section>
  )
}

function ContactPage() {
  return (
    <section className="legal-page">
      <h1>Contact</h1>
      <p>
        Use this page for support requests, tool feedback, billing questions,
        partnership ideas, or feature suggestions. Email{' '}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a> for direct help.
      </p>
      <form className="contact-form">
        <label>
          Name
          <input placeholder="Your name" />
        </label>
        <label>
          Email
          <input placeholder="you@example.com" type="email" />
        </label>
        <label>
          Message
          <textarea placeholder="How can we help?" />
        </label>
        <button
          type="button"
          onClick={() => {
            trackEvent('contact_lead', {})
            window.location.href = `mailto:${supportEmail}`
          }}
        >
          Prepare support request
        </button>
      </form>
    </section>
  )
}

function LegalTeaser() {
  return (
    <section className="legal-section" id="legal">
      <article>
        <h2>Privacy</h2>
        <p>Draft data is saved in this browser only until account sync exists.</p>
        <Link to="/privacy">Read privacy</Link>
      </article>
      <article>
        <h2>Terms</h2>
        <p>Tools are productivity helpers and should be reviewed before use.</p>
        <Link to="/terms">Read terms</Link>
      </article>
      <article>
        <h2>Contact</h2>
        <p>
          For support, billing questions, or partnership ideas, contact{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
        <Link to="/contact">Open contact</Link>
      </article>
    </section>
  )
}

export default App
