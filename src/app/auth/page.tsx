import { redirect } from 'next/navigation'

export default function AuthIndexPage(): null {
  redirect('/auth/login')
  return null
}
