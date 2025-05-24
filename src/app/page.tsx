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
        <DashboardCard
          href="/events"
          icon={
            <svg
              className="h-10 w-10 text-indigo-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="7"
                width="18"
                height="14"
                rx="2"
                stroke="currentColor"
              />
              <path
                d="M16 3v4M8 3v4M3 11h18"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Events"
          description="Create, view, and RSVP to family events."
        />
        <DashboardCard
          href="/polls"
          icon={
            <svg
              className="h-10 w-10 text-pink-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect
                x="4"
                y="10"
                width="4"
                height="8"
                rx="1"
                stroke="currentColor"
              />
              <rect
                x="10"
                y="6"
                width="4"
                height="12"
                rx="1"
                stroke="currentColor"
              />
              <rect
                x="16"
                y="3"
                width="4"
                height="15"
                rx="1"
                stroke="currentColor"
              />
            </svg>
          }
          title="Polls & Voting"
          description="Create polls and vote as a family."
        />
        <DashboardCard
          href="/family-tree"
          icon={
            <svg
              className="h-10 w-10 text-green-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="4" r="2" stroke="currentColor" />
              <circle cx="6" cy="12" r="2" stroke="currentColor" />
              <circle cx="18" cy="12" r="2" stroke="currentColor" />
              <circle cx="12" cy="20" r="2" stroke="currentColor" />
              <path
                d="M12 6v4M12 14v4M6 14l6 6M18 14l-6 6M6 10l6-6M18 10l-6-6"
                stroke="currentColor"
              />
            </svg>
          }
          title="Family Tree"
          description="Visualize your family relationships."
        />
        <DashboardCard
          href="/stories"
          icon={
            <svg
              className="h-10 w-10 text-orange-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect
                x="5"
                y="4"
                width="14"
                height="16"
                rx="2"
                stroke="currentColor"
              />
              <path
                d="M9 8h6M9 12h6M9 16h2"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Family Stories"
          description="Record and view family stories."
        />
        <DashboardCard
          href="/recipes"
          icon={
            <svg
              className="h-10 w-10 text-lime-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 19c0-2.5 2-4.5 4.5-4.5S13 16.5 13 19v1H4v-1z"
                stroke="currentColor"
              />
              <circle cx="8.5" cy="8.5" r="4.5" stroke="currentColor" />
              <path
                d="M16 7h4M18 5v4"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Recipe Sharing"
          description="Share and discover family recipes."
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
