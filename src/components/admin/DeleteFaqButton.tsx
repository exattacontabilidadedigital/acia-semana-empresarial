'use client'

import { deleteFaqAction } from '@/app/admin/chat-conhecimento/actions'

export default function DeleteFaqButton({ id }: { id: number }) {
  return (
    <form
      action={deleteFaqAction}
      onSubmit={(e) => {
        if (
          !confirm(
            'Excluir esta FAQ definitivamente? Esta ação não pode ser desfeita.',
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-paper-2"
        style={{ color: 'var(--ink-50)' }}
        title="Excluir"
      >
        ✕
      </button>
    </form>
  )
}
