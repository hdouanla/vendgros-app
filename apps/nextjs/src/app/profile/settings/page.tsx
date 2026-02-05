"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { signOut } from "@acme/auth/client";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState("");
  const utils = api.useUtils();

  if (sessionLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/profile/settings"));
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    // Invalidate the session cache to update navbar immediately
    await utils.auth.getSession.invalidate();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your account preferences and security
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            Account Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Name
              </label>
              <p className="mt-1 text-gray-900">{session.user.name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Email
              </label>
              <p className="mt-1 text-gray-900">{session.user.email}</p>
            </div>

            <button
              onClick={() => router.push("/profile/edit")}
              className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            Privacy & Security
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/privacy-policy")}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Privacy Policy</p>
                  <p className="text-xs text-gray-600">View our privacy policy</p>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button
              onClick={() => router.push("/terms-of-service")}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Terms of Service</p>
                  <p className="text-xs text-gray-600">View our terms of service</p>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Account Actions */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            Account Actions
          </h2>

          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-red-900">
            Danger Zone
          </h2>

          <button
            onClick={() => {
              setDeleteEmailInput("");
              setShowDeleteModal(true);
            }}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete Account
          </button>
          <p className="mt-2 text-xs text-red-800">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>

        {/* Delete Account Modal */}
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          email={session.user.email ?? ""}
          emailInput={deleteEmailInput}
          onEmailInputChange={setDeleteEmailInput}
        />
      </div>
    </div>
  );
}

function DeleteAccountModal({
  isOpen,
  onClose,
  email,
  emailInput,
  onEmailInputChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  emailInput: string;
  onEmailInputChange: (value: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const emailMatches = emailInput === email;

  const deleteAccount = api.user.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut();
      window.location.href = "/";
    },
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !deleteAccount.isPending) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, deleteAccount.isPending]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      inputRef.current?.focus();
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => {
          if (!deleteAccount.isPending) onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
        <p className="mt-2 text-sm text-gray-600">
          This action is permanent and cannot be undone. All your data will be deleted.
        </p>
        <div className="mt-4">
          <label
            htmlFor="confirm-email"
            className="block text-sm font-medium text-gray-700"
          >
            Type <span className="font-semibold">{email}</span> to confirm
          </label>
          <input
            ref={inputRef}
            id="confirm-email"
            type="email"
            value={emailInput}
            onChange={(e) => onEmailInputChange(e.target.value)}
            placeholder={email}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        {deleteAccount.error && (
          <p className="mt-2 text-sm text-red-600">
            {deleteAccount.error.message}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteAccount.isPending}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!emailMatches || deleteAccount.isPending}
            onClick={() => deleteAccount.mutate({ email: emailInput })}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
