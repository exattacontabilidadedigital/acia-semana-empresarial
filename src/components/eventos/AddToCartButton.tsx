'use client'

import { useState } from 'react'
import { CalendarPlus, Check, Plus, Minus } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import type { Event } from '@/types/database'

interface AddToCartButtonProps {
  event: Event
  availableSpots: number
  halfPriceAvailable: number
}

export default function AddToCartButton({ event, availableSpots, halfPriceAvailable }: AddToCartButtonProps) {
  const { cart, addToCart, removeFromCart, updateCartItem } = useCart()
  const [showControls, setShowControls] = useState(false)

  const cartItem = cart.find((i) => i.eventId === event.id)
  const isInCart = !!cartItem

  if (availableSpots <= 0) return null

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isInCart) {
      setShowControls(!showControls)
      return
    }

    addToCart({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.start_time,
      eventLocation: event.location,
      eventImageUrl: event.image_url,
      price: event.price,
      halfPriceSlots: halfPriceAvailable,
      quantity: 1,
      isHalfPrice: false,
      couponCode: null,
      couponDiscount: 0,
    })
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (cartItem && cartItem.quantity < Math.min(10, availableSpots)) {
      updateCartItem(event.id, { quantity: cartItem.quantity + 1 })
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (cartItem) {
      if (cartItem.quantity <= 1) {
        removeFromCart(event.id)
        setShowControls(false)
      } else {
        updateCartItem(event.id, { quantity: cartItem.quantity - 1 })
      }
    }
  }

  if (isInCart && showControls) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
        <button
          onClick={handleDecrement}
          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="text-sm font-bold text-purple w-6 text-center">{cartItem.quantity}</span>
        <button
          onClick={handleIncrement}
          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-purple/10 hover:text-purple transition-colors"
          disabled={cartItem.quantity >= Math.min(10, availableSpots)}
        >
          <Plus size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleAdd}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        isInCart
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-purple/10 text-purple hover:bg-purple/20'
      }`}
    >
      {isInCart ? (
        <>
          <Check size={14} />
          {cartItem.quantity}
        </>
      ) : (
        <>
          <CalendarPlus size={14} />
          Adicionar
        </>
      )}
    </button>
  )
}
