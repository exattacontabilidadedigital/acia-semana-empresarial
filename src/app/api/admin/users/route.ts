import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Listar usuários com perfis e roles
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Buscar perfis
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Buscar roles
    const { data: roles } = await supabase
      .from('roles')
      .select('*')
      .order('name')

    // Buscar users_roles
    const { data: usersRoles } = await supabase
      .from('users_roles')
      .select('*')

    // Buscar auth users via admin API
    const { data: authData } = await supabase.auth.admin.listUsers()
    const authUsers = authData?.users ?? []

    const users = (profiles ?? []).map((profile) => {
      const authUser = authUsers.find((u) => u.id === profile.id)
      const userRoleIds = (usersRoles ?? [])
        .filter((ur) => ur.user_id === profile.id)
        .map((ur) => ur.role_id)
      const userRoles = (roles ?? []).filter((r) => userRoleIds.includes(r.id))

      return {
        id: profile.id,
        email: authUser?.email ?? '—',
        full_name: profile.full_name,
        phone: profile.phone,
        roles: userRoles.map((r) => r.name),
        created_at: profile.created_at,
        last_sign_in: authUser?.last_sign_in_at ?? null,
      }
    })

    return NextResponse.json({ users, roles: roles ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[ADMIN USERS] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST - Criar usuário ou gerenciar roles
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body
    const supabase = createAdminClient()

    // ==================== CRIAR USUÁRIO ====================
    if (action === 'create') {
      const { email, password, full_name, phone, role_ids } = body

      if (!email || !password) {
        return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
      }

      // Criar usuário no auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }

      // Atualizar perfil
      if (full_name || phone) {
        await supabase
          .from('user_profiles')
          .update({
            full_name: full_name || null,
            phone: phone || null,
          })
          .eq('id', authUser.user.id)
      }

      // Atribuir roles
      if (role_ids && role_ids.length > 0) {
        const roleInserts = role_ids.map((roleId: number) => ({
          user_id: authUser.user.id,
          role_id: roleId,
        }))
        await supabase.from('users_roles').insert(roleInserts)
      }

      return NextResponse.json({
        success: true,
        message: 'Usuário criado com sucesso',
        user_id: authUser.user.id,
      })
    }

    // ==================== ATUALIZAR ROLES ====================
    if (action === 'update_roles') {
      const { user_id, role_ids } = body

      if (!user_id) {
        return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })
      }

      // Remover roles atuais
      await supabase.from('users_roles').delete().eq('user_id', user_id)

      // Inserir novas roles
      if (role_ids && role_ids.length > 0) {
        const roleInserts = role_ids.map((roleId: number) => ({
          user_id,
          role_id: roleId,
        }))
        await supabase.from('users_roles').insert(roleInserts)
      }

      return NextResponse.json({ success: true, message: 'Roles atualizadas' })
    }

    // ==================== ATUALIZAR PERFIL ====================
    if (action === 'update_profile') {
      const { user_id, full_name, phone } = body

      if (!user_id) {
        return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })
      }

      await supabase
        .from('user_profiles')
        .update({ full_name: full_name || null, phone: phone || null })
        .eq('id', user_id)

      return NextResponse.json({ success: true, message: 'Perfil atualizado' })
    }

    // ==================== RESETAR SENHA ====================
    if (action === 'reset_password') {
      const { user_id, new_password } = body

      if (!user_id || !new_password) {
        return NextResponse.json({ error: 'user_id e new_password obrigatórios' }, { status: 400 })
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
        password: new_password,
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'Senha alterada' })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[ADMIN USERS] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
