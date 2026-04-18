'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  getCart,
  addToCart as addToCartStore,
  removeFromCart as removeFromCartStore,
  updateCartItem as updateCartItemStore,
  clearCart as clearCartStore,
  getCartPaidTotal,
  type CartItem,
} from '@/lib/cart'

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (eventId: number) => void
  updateCartItem: (eventId: number, updates: Partial<CartItem>) => void
  clearCart: () => void
  cartCount: number
  cartTotal: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])

  const syncCart = useCallback(() => {
    setCart(getCart())
  }, [])

  useEffect(() => {
    syncCart()
    window.addEventListener('cartUpdated', syncCart)
    window.addEventListener('storage', syncCart)
    return () => {
      window.removeEventListener('cartUpdated', syncCart)
      window.removeEventListener('storage', syncCart)
    }
  }, [syncCart])

  const addToCart = useCallback((item: CartItem) => {
    setCart(addToCartStore(item))
  }, [])

  const removeFromCart = useCallback((eventId: number) => {
    setCart(removeFromCartStore(eventId))
  }, [])

  const updateCartItem = useCallback((eventId: number, updates: Partial<CartItem>) => {
    setCart(updateCartItemStore(eventId, updates))
  }, [])

  const clearCartFn = useCallback(() => {
    clearCartStore()
    setCart([])
  }, [])

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const cartTotal = getCartPaidTotal(cart)

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart: clearCartFn,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
