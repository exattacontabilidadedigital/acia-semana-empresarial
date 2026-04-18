export interface CartItem {
  eventId: number
  eventTitle: string
  eventDate: string
  eventTime: string
  eventLocation: string | null
  eventImageUrl: string | null
  price: number
  halfPriceSlots: number
  quantity: number
  isHalfPrice: boolean
  couponCode: string | null
  couponDiscount: number
}

const CART_KEY = 'se2026_cart'

function dispatchCartUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cartUpdated'))
  }
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToCart(item: CartItem): CartItem[] {
  const cart = getCart()
  const existing = cart.findIndex((i) => i.eventId === item.eventId)
  if (existing >= 0) {
    cart[existing] = { ...cart[existing], ...item }
  } else {
    cart.push(item)
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  dispatchCartUpdate()
  return cart
}

export function removeFromCart(eventId: number): CartItem[] {
  const cart = getCart().filter((i) => i.eventId !== eventId)
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  dispatchCartUpdate()
  return cart
}

export function updateCartItem(eventId: number, updates: Partial<CartItem>): CartItem[] {
  const cart = getCart()
  const idx = cart.findIndex((i) => i.eventId === eventId)
  if (idx >= 0) {
    cart[idx] = { ...cart[idx], ...updates }
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  dispatchCartUpdate()
  return cart
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY)
  dispatchCartUpdate()
}

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.quantity, 0)
}

export function getCartPaidTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => {
    if (item.price === 0) return sum
    const unitPrice = item.isHalfPrice ? item.price / 2 : item.price
    const discount = item.couponDiscount * item.quantity
    return sum + Math.max(0, unitPrice * item.quantity - discount)
  }, 0)
}
