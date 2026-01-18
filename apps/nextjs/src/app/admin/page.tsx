"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = api.admin.getDashboardStats.useQuery();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of platform activity and quick actions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.users.total ?? 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">
              +{stats?.users.recentSignups ?? 0}
            </span>
            <span className="text-gray-500 ml-2">last 7 days</span>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.users.active ?? 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            {stats?.users.total
              ? ((stats.users.active / stats.users.total) * 100).toFixed(1)
              : 0}
            % of total users
          </div>
        </div>

        {/* Suspended/Banned */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspended/Banned</p>
              <p className="text-3xl font-bold text-red-600">
                {(stats?.users.suspended ?? 0) + (stats?.users.banned ?? 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <span className="text-yellow-600">{stats?.users.suspended ?? 0}</span> suspended,{" "}
            <span className="text-red-600">{stats?.users.banned ?? 0}</span> banned
          </div>
        </div>

        {/* Pending Listings */}
        <Link href="/admin/moderation" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-3xl font-bold text-orange-600">
                {stats?.listings.pendingReview ?? 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-600">
            Click to review →
          </div>
        </Link>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Listings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Listings</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.listings.total ?? 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <span className="text-green-600 font-medium">
              {stats?.listings.published ?? 0}
            </span>
            <span className="text-gray-500 ml-1">published</span>
            <span className="text-gray-300 mx-2">|</span>
            <span className="text-blue-600 font-medium">
              +{stats?.listings.recentCreated ?? 0}
            </span>
            <span className="text-gray-500 ml-1">this week</span>
          </div>
        </div>

        {/* Total Reservations */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reservations</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.reservations.total ?? 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🛒</span>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <span className="text-green-600 font-medium">
              {stats?.reservations.completed ?? 0}
            </span>
            <span className="text-gray-500 ml-1">completed</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.reservations.total
                  ? ((stats.reservations.completed / stats.reservations.total) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Based on all reservations
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/moderation"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <span className="text-2xl">📝</span>
            <div>
              <p className="font-medium text-gray-900">Review Listings</p>
              <p className="text-sm text-gray-500">
                {stats?.listings.pendingReview ?? 0} pending
              </p>
            </div>
          </Link>

          <Link
            href="/admin/moderation-ai"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-medium text-gray-900">AI Moderation</p>
              <p className="text-sm text-gray-500">Auto-moderate listings</p>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-medium text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-500">
                {stats?.users.total ?? 0} users
              </p>
            </div>
          </Link>

          <Link
            href="/admin/trust-safety"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-colors"
          >
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="font-medium text-gray-900">Trust & Safety</p>
              <p className="text-sm text-gray-500">Monitor fraud & reviews</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
