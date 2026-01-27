/**
 * CMS Loading Component
 * Shows a skeleton loading state while CMS content is being fetched
 */

export function CMSLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-lg bg-white p-8 shadow-md animate-pulse">
          {/* Title skeleton */}
          <div className="h-9 w-2/3 bg-gray-200 rounded mb-8" />

          {/* Last updated skeleton */}
          <div className="h-4 w-40 bg-gray-200 rounded mb-6" />

          {/* Content skeletons */}
          <div className="space-y-4">
            {/* Paragraph 1 */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-11/12" />
              <div className="h-4 bg-gray-200 rounded w-4/5" />
            </div>

            {/* Heading */}
            <div className="h-6 bg-gray-200 rounded w-1/3 mt-8" />

            {/* Paragraph 2 */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-10/12" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-9/12" />
            </div>

            {/* List items */}
            <div className="space-y-2 pl-4">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-4/5" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>

            {/* Heading */}
            <div className="h-6 bg-gray-200 rounded w-2/5 mt-8" />

            {/* Paragraph 3 */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>

          {/* Footer skeleton */}
          <div className="mt-8 flex gap-4 border-t pt-6">
            <div className="h-5 w-28 bg-gray-200 rounded" />
            <div className="h-5 w-1 bg-gray-200 rounded" />
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
