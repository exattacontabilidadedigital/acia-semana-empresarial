'use client'

import { Trash2 } from 'lucide-react'
import { deleteEditionAction } from '@/app/admin/edicoes/actions'

export default function ConfirmDeleteEdicaoButton({ id }: { id: string }) {
  return (
    <form
      action={deleteEditionAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            'Excluir esta edição? As fotos vinculadas perderão a referência (não serão deletadas).'
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn btn-ghost w-full justify-center"
        style={{ color: '#b91c1c' }}
      >
        <Trash2 size={14} /> Excluir edição
      </button>
    </form>
  )
}
