'use client'

import { signOut } from '@/lib/actions/auth'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
    >
      Logout
    </button>
  )
}
