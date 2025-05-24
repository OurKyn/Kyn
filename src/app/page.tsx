'use client'

import Link from 'next/link'
import {
  UserIcon,
  UsersIcon,
  HomeIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-10 text-gray-800">Kyn Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
        <DashboardCard
          href="/feed"
          icon={<HomeIcon className="h-10 w-10 text-blue-600" />}
          title="Family Feed"
          description="See updates, posts, and media from your family."
        />
        <DashboardCard
          href="/messages"
          icon={<UsersIcon className="h-10 w-10 text-pink-600" />}
          title="Direct Messages"
          description="Send private messages to your family members."
        />
        <DashboardCard
          href="/family"
          icon={<UsersIcon className="h-10 w-10 text-green-600" />}
          title="Family Management"
          description="Create or join a family, invite and manage members."
        />
        <DashboardCard
          href="/join"
          icon={<LinkIcon className="h-10 w-10 text-yellow-500" />}
          title="Join a Family"
          description="Join a family using an invite password or QR code."
        />
        <DashboardCard
          href="/profile"
          icon={<UserIcon className="h-10 w-10 text-purple-600" />}
          title="Your Profile"
          description="Edit your profile and avatar."
        />
        <DashboardCard
          href="/albums"
          icon={
            <Image
              src="/icons/photo-album.svg"
              alt="Albums"
              width={40}
              height={40}
              className="h-10 w-10 text-pink-500"
            />
          }
          title="Photo Albums"
          description="Create, view, and upload family photo albums."
        />
        <DashboardCard
          href="/tasks"
          icon={
            <svg
              className="h-10 w-10 text-emerald-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                stroke="currentColor"
              />
              <path
                d="M9 9h6M9 13h4"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Family Tasks"
          description="Assign, complete, and view family tasks."
        />
      </div>
    </main>
  )
}

function DashboardCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl bg-white shadow-md hover:shadow-lg transition p-8 text-center border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="rounded-full bg-gray-100 p-3 mb-2">{icon}</div>
        <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-700">
          {title}
        </h2>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
    </Link>
  )
}
