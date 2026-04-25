const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ''

export class AsaasError extends Error {
  code: string | null
  description: string | null
  httpStatus: number

  constructor(message: string, code: string | null, description: string | null, httpStatus: number) {
    super(message)
    this.name = 'AsaasError'
    this.code = code
    this.description = description
    this.httpStatus = httpStatus
  }
}

async function asaasRequest(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${ASAAS_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro na API Asaas' }))
    const firstError = error.errors?.[0]
    const description = firstError?.description || error.message || 'Erro na API Asaas'
    const code = firstError?.code || null
    throw new AsaasError(description, code, description, res.status)
  }

  return res.json()
}

export interface CreateCustomerData {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
}

export interface CreditCardPayload {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface CreditCardHolderInfo {
  name: string
  email: string
  cpfCnpj: string
  postalCode?: string
  addressNumber?: string
  addressComplement?: string
  phone?: string
  mobilePhone?: string
}

export interface CreatePaymentData {
  customer: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  callback?: {
    successUrl: string
    autoRedirect: boolean
  }
  installmentCount?: number
  totalValue?: number
  creditCard?: CreditCardPayload
  creditCardHolderInfo?: CreditCardHolderInfo
  /** Token de cartão previamente salvo (do retorno de payment anterior). Quando presente,
   *  Asaas usa o cartão tokenizado e ignora `creditCard` / `creditCardHolderInfo`. */
  creditCardToken?: string
  remoteIp?: string
}

export async function createCustomer(data: CreateCustomerData) {
  const existing = await asaasRequest(`/customers?cpfCnpj=${data.cpfCnpj}`)
  if (existing.data?.length > 0) {
    return existing.data[0]
  }
  return asaasRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function createPayment(data: CreatePaymentData) {
  return asaasRequest('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getPaymentStatus(paymentId: string) {
  return asaasRequest(`/payments/${paymentId}`)
}

export async function getPaymentPixQrCode(paymentId: string) {
  return asaasRequest(`/payments/${paymentId}/pixQrCode`)
}
