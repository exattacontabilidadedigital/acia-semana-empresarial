const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ''

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
    throw new Error(error.errors?.[0]?.description || error.message || 'Erro na API Asaas')
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
