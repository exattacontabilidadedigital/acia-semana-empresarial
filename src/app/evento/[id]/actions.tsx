'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Check, Plus, Minus, ArrowRight } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'
import type { Event } from '@/types/database'

interface EventPageActionsProps {
  event: Event
  availableSpots: number
  halfPriceAvailable: number
}

export default function EventPageActions({ event, availableSpots, halfPriceAvailable }: EventPageActionsProps) {
  const router = useRouter()
  const { cart, addToCart, removeFromCart, updateCartItem, cartCount } = useCart()
  const cartItem = cart.find((i) => i.eventId === event.id)
  const isInCart = !!cartItem

  const [quantity, setQuantity] = useState(1)
  const [isHalfPrice, setIsHalfPrice] = useState(false)

  const maxQty = Math.min(10, availableSpots)
  const hasHalfPrice = event.half_price > 0 && event.price > 0 && halfPriceAvailable > 0

  const handleAdd = () => {
    addToCart({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.start_time,
      eventLocation: event.location,
      eventImageUrl: event.image_url,
      price: event.price,
      halfPriceSlots: halfPriceAvailable,
      quantity,
      isHalfPrice,
      couponCode: null,
      couponDiscount: 0,
    })
  }

  const handleAddAndGo = () => {
    handleAdd()
    router.push('/carrinho')
  }

  // ========== JÁ NO CARRINHO ==========
  if (isInCart) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Evento no carrinho</span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-600">Quantidade:</span>
            <button
              onClick={() =>
                cartItem.quantity <= 1
                  ? removeFromCart(event.id)
                  : updateCartItem(event.id, { quantity: cartItem.quantity - 1 })
              }
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="text-lg font-bold w-6 text-center">{cartItem.quantity}</span>
            <button
              onClick={() =>
                updateCartItem(event.id, { quantity: Math.min(maxQty, cartItem.quantity + 1) })
              }
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-purple hover:text-purple transition-colors"
              disabled={cartItem.quantity >= maxQty}
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            onClick={() => removeFromCart(event.id)}
            className="text-xs text-red-500 hover:underline"
          >
            Remover do carrinho
          </button>
        </div>

        <Link
          href="/carrinho"
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange text-white font-bold text-sm hover:bg-orange-dark transition-colors"
        >
          <ShoppingCart size={18} />
          Ir para o carrinho ({cartCount})
          <ArrowRight size={16} />
        </Link>

        <Link
          href="/eventos"
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-gray-300 text-gray-600 font-semibold text-sm hover:border-purple hover:text-purple transition-colors"
        >
          <Plus size={16} />
          Adicionar mais eventos
        </Link>
      </div>
    )
  }

  // ========== NÃO NO CARRINHO ==========
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="text-lg font-bold text-dark mb-1">Garanta seu ingresso</h3>
      <p className="text-xs text-gray-400 mb-5">
        Adicione ao carrinho e finalize a compra de todos os eventos juntos.
      </p>

      {/* Half price toggle */}
      {hasHalfPrice && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-dark mb-2">Tipo de ingresso</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsHalfPrice(false)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                !isHalfPrice
                  ? 'border-purple bg-purple/10 text-purple'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Inteira
              <span className="block text-[10px] font-normal mt-0.5">{formatCurrency(event.price)}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHalfPrice(true)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                isHalfPrice
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Meia-entrada
              <span className="block text-[10px] font-normal mt-0.5">{formatCurrency(event.price / 2)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-dark mb-2">Quantidade</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 text-dark text-lg font-bold hover:border-purple hover:text-purple transition-colors disabled:opacity-40"
            disabled={quantity <= 1}
          >
            -
          </button>
          <span className="text-2xl font-bold text-dark w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 text-dark text-lg font-bold hover:border-purple hover:text-purple transition-colors disabled:opacity-40"
            disabled={quantity >= maxQty}
          >
            +
          </button>
          <span className="text-xs text-gray-400">máx. {maxQty}</span>
        </div>
      </div>

      {/* Price summary */}
      {event.price > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 mb-5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>{quantity}x {isHalfPrice ? 'meia-entrada' : 'inteira'}</span>
            <span>{formatCurrency((isHalfPrice ? event.price / 2 : event.price) * quantity)}</span>
          </div>
        </div>
      )}

      {/* CTA Buttons */}
      <button
        onClick={handleAddAndGo}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange text-white font-bold text-sm hover:bg-orange-dark transition-colors mb-3"
      >
        <ShoppingCart size={18} />
        {event.price === 0 ? 'Inscrever-se' : `Comprar — ${formatCurrency((isHalfPrice ? event.price / 2 : event.price) * quantity)}`}
      </button>

      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-purple text-purple font-semibold text-sm hover:bg-purple/5 transition-colors"
      >
        <Plus size={16} />
        Adicionar ao carrinho e continuar vendo
      </button>

      {cartCount > 0 && (
        <Link
          href="/carrinho"
          className="block text-center text-xs text-purple font-semibold mt-3 hover:underline"
        >
          Você tem {cartCount} {cartCount === 1 ? 'ingresso' : 'ingressos'} no carrinho
        </Link>
      )}
    </div>
  )
}
