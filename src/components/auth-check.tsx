import { useAuthCheck } from '@/hooks/useAuthCheck'

interface AuthCheckProps {
  children: React.ReactNode
}

export default function AuthCheck({ children }: AuthCheckProps) {
  useAuthCheck()
  return <>{children}</>
}
