import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { deactivateAccount } from '@campus-marketplace/backend'

// Mutation hook for soft-deleting the authenticated user's account.
// On success: clears localStorage tokens and navigates to /login.
export function useDeactivateAccount() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({
      userId,
      accessToken,
      refreshToken,
    }: {
      userId: string
      accessToken: string
      refreshToken: string
    }) => deactivateAccount(userId, accessToken, refreshToken),
    onSuccess: () => {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      navigate('/login', { replace: true })
    },
  })
}
