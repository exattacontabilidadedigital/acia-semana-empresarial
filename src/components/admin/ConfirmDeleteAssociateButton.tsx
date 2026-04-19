'use client'

import { Trash2 } from 'lucide-react'
import { deleteAssociateAction } from '@/app/admin/associados/actions'

export default function ConfirmDeleteAssociateButton({ id }: { id: string }) {
  return (
    <form
      action={deleteAssociateAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            'Excluir este associado? Cupons vinculados perderão a referência.'
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
        <Trash2 size={14} /> Excluir
      </button>
    </form>
  )
}
