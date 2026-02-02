"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "~/trpc/react";
import { QRCode } from "@acme/ui/qr-code";
import { getStorageUrl } from "~/lib/storage";

type ViewPerspective = "admin" | "buyer" | "seller";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  NO_SHOW: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const accountStatusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  BANNED: "bg-red-100 text-red-800",
};

// Type definitions for the reservation data
interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  accountStatus?: string | null;
  verificationBadge?: string | null;
  buyerRatingAverage?: number | null;
  buyerRatingCount?: number | null;
  sellerRatingAverage?: number | null;
  sellerRatingCount?: number | null;
  createdAt?: Date | null;
}

interface MessageInfo {
  id: string;
  content: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface RatingInfo {
  id: string;
  score: number;
  comment: string | null;
  ratingType: string;
  isVisible: boolean;
  createdAt: Date;
  rater: {
    id: string;
    name: string | null;
    email: string;
  };
  rated: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ReservationData {
  id: string;
  verificationCode: string;
  qrCodeHash: string;
  status: string;
  quantityReserved: number;
  totalPrice: number;
  depositAmount: number;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
  listingId: string;
  listing: {
    id: string;
    title: string;
    category: string;
    photos: string[] | null;
    pricePerPiece: number;
    pickupAddress: string;
    pickupInstructions: string | null;
    postalCode: string | null;
    seller: UserInfo;
  };
  buyer: UserInfo;
  ratings: RatingInfo[] | null;
  conversation: {
    id: string;
    messages: MessageInfo[];
  } | null;
}

function PerspectiveToggle({
  value,
  onChange,
}: {
  value: ViewPerspective;
  onChange: (value: ViewPerspective) => void;
}) {
  const tabs: { value: ViewPerspective; label: string }[] = [
    { value: "admin", label: "Admin View" },
    { value: "buyer", label: "Buyer View" },
    { value: "seller", label: "Seller View" },
  ];

  return (
    <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            value === tab.value
              ? "bg-white text-gray-900 shadow"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function UserCard({
  title,
  user,
  role,
}: {
  title: string;
  user: UserInfo;
  role: "buyer" | "seller";
}) {
  const ratingAverage = role === "buyer" ? user.buyerRatingAverage : user.sellerRatingAverage;
  const ratingCount = role === "buyer" ? user.buyerRatingCount : user.sellerRatingCount;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {user.accountStatus && (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${accountStatusColors[user.accountStatus] || "bg-gray-100 text-gray-800"}`}
          >
            {user.accountStatus}
          </span>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="text-sm font-medium text-gray-500">Name</div>
          <div className="text-gray-900">{user.name || "No name"}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Email</div>
          <div className="text-gray-900">{user.email}</div>
        </div>
        {user.phone && (
          <div>
            <div className="text-sm font-medium text-gray-500">Phone</div>
            <div className="text-gray-900">{user.phone}</div>
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-500">
            {role === "buyer" ? "Buyer" : "Seller"} Rating
          </div>
          <div className="text-gray-900">
            {ratingAverage ? `${ratingAverage.toFixed(1)} / 5` : "No ratings"}{" "}
            ({ratingCount || 0} reviews)
          </div>
        </div>
        {user.verificationBadge && user.verificationBadge !== "NONE" && (
          <div>
            <div className="text-sm font-medium text-gray-500">Verification</div>
            <div className="text-gray-900">{user.verificationBadge}</div>
          </div>
        )}
        {user.createdAt && (
          <div>
            <div className="text-sm font-medium text-gray-500">Member Since</div>
            <div className="text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        )}
        <div className="pt-2">
          <Link
            href={`/admin/users?search=${encodeURIComponent(user.email)}`}
            className="text-sm text-green-600 hover:text-green-800"
          >
            View User Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminView({ reservation }: { reservation: ReservationData }) {
  return (
    <div className="space-y-6">
      {/* Full Reservation Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Reservation Details
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="text-sm font-medium text-gray-500">Reservation ID</div>
            <div className="font-mono text-sm text-gray-900">{reservation.id}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Verification Code</div>
            <div className="font-mono text-xl font-bold tracking-widest text-gray-900">
              {reservation.verificationCode}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Status</div>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColors[reservation.status] || "bg-gray-100 text-gray-800"}`}
            >
              {reservation.status.replace("_", " ")}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Quantity</div>
            <div className="text-gray-900">{reservation.quantityReserved} units</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Total Price</div>
            <div className="text-gray-900">${reservation.totalPrice.toFixed(2)} CAD</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Deposit</div>
            <div className="text-gray-900">${reservation.depositAmount.toFixed(2)} CAD</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Created</div>
            <div className="text-gray-900">
              {new Date(reservation.createdAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Expires</div>
            <div className="text-gray-900">
              {new Date(reservation.expiresAt).toLocaleString()}
            </div>
          </div>
          {reservation.completedAt && (
            <div>
              <div className="text-sm font-medium text-gray-500">Completed</div>
              <div className="text-gray-900">
                {new Date(reservation.completedAt).toLocaleString()}
              </div>
            </div>
          )}
          {reservation.stripePaymentIntentId && (
            <div>
              <div className="text-sm font-medium text-gray-500">Stripe Payment ID</div>
              <div className="font-mono text-sm text-gray-900">
                {reservation.stripePaymentIntentId}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buyer and Seller Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UserCard title="Buyer" user={reservation.buyer} role="buyer" />
        <UserCard title="Seller" user={reservation.listing.seller} role="seller" />
      </div>

      {/* Listing Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Listing Details</h3>
        <div className="flex gap-6">
          {reservation.listing.photos && reservation.listing.photos[0] && (
            <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src={getStorageUrl(reservation.listing.photos[0])}
                alt={reservation.listing.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <h4 className="text-xl font-medium text-gray-900">
              {reservation.listing.title}
            </h4>
            <div className="text-sm text-gray-600">
              Category: {reservation.listing.category}
            </div>
            <div className="text-sm text-gray-600">
              Price: ${reservation.listing.pricePerPiece.toFixed(2)} per unit
            </div>
            <div className="text-sm text-gray-600">
              Pickup: {reservation.listing.pickupAddress}
            </div>
            {reservation.listing.pickupInstructions && (
              <div className="text-sm text-gray-600">
                Instructions: {reservation.listing.pickupInstructions}
              </div>
            )}
            <Link
              href={`/listings/${reservation.listingId}`}
              target="_blank"
              className="inline-block text-sm text-green-600 hover:text-green-800"
            >
              View Listing
            </Link>
          </div>
        </div>
      </div>

      {/* Ratings */}
      {reservation.ratings && reservation.ratings.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Ratings</h3>
          <div className="space-y-4">
            {reservation.ratings.map((rating) => (
              <div
                key={rating.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">
                    {rating.rater.name || rating.rater.email} rated{" "}
                    {rating.rated.name || rating.rated.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">{"★".repeat(rating.score)}</span>
                    <span className="text-gray-300">{"★".repeat(5 - rating.score)}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      ({rating.ratingType.replace("AS_", "as ")})
                    </span>
                  </div>
                </div>
                {rating.comment && (
                  <p className="mt-2 text-sm text-gray-600">{rating.comment}</p>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  {new Date(rating.createdAt).toLocaleString()}
                  {rating.isVisible && " • Visible"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Chat Messages */}
      {reservation.conversation && reservation.conversation.messages.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Chat Messages
          </h3>
          <div className="space-y-3">
            {reservation.conversation.messages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">
                    {message.sender.name || message.sender.email}
                  </span>
                  <span className="text-gray-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{message.content}</p>
              </div>
            ))}
          </div>
          <Link
            href={`/chat/${reservation.id}`}
            target="_blank"
            className="mt-4 inline-block text-sm text-green-600 hover:text-green-800"
          >
            View Full Conversation
          </Link>
        </div>
      )}
    </div>
  );
}

function BuyerView({ reservation }: { reservation: ReservationData }) {
  const depositPaid = reservation.status !== "PENDING";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          This is a read-only preview of what the buyer sees.
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-lg p-4 ${
          reservation.status === "CONFIRMED"
            ? "bg-green-50 text-green-800"
            : reservation.status === "PENDING"
              ? "bg-yellow-50 text-yellow-800"
              : reservation.status === "COMPLETED"
                ? "bg-green-50 text-green-800"
                : "bg-gray-50 text-gray-800"
        }`}
      >
        <p className="font-medium">
          Status: {reservation.status.replace("_", " ")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Listing Details */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-2 text-xl font-semibold">
              {reservation.listing.title}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">
                  {reservation.quantityReserved} units
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Price:</span>
                <span className="font-medium">
                  ${(reservation.totalPrice * 1.05).toFixed(2)} CAD
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Deposit Paid:</span>
                <span className="font-medium text-green-600">
                  ${reservation.depositAmount.toFixed(2)} CAD
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Balance Due at Pickup:</span>
                <span className="text-xl font-bold">
                  ${reservation.totalPrice.toFixed(2)} CAD
                </span>
              </div>
            </div>
          </div>

          {/* Pickup Details */}
          {depositPaid && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Pickup Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Address:</span>
                  <p className="mt-1">
                    {reservation.listing.pickupAddress}
                    {reservation.listing.postalCode && `, ${reservation.listing.postalCode}`}
                  </p>
                </div>
                {reservation.listing.pickupInstructions && (
                  <div>
                    <span className="font-medium text-gray-600">Instructions:</span>
                    <p className="mt-1">{reservation.listing.pickupInstructions}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-600">Pickup Deadline:</span>
                  <p className="mt-1">
                    {new Date(reservation.expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Seller Info */}
          {depositPaid && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Seller Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <p className="mt-1">{reservation.listing.seller.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Contact:</span>
                  <p className="mt-1">{reservation.listing.seller.email}</p>
                  {reservation.listing.seller.phone && (
                    <p>{reservation.listing.seller.phone}</p>
                  )}
                </div>
                <div>
                  <span className="font-medium text-gray-600">Seller Rating:</span>
                  <p className="mt-1">
                    {reservation.listing.seller.sellerRatingAverage?.toFixed(1) ?? "—"}{" "}
                    ({reservation.listing.seller.sellerRatingCount ?? 0} reviews)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - QR Code */}
        {depositPaid && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-center text-lg font-semibold">
                Pickup QR Code
              </h3>
              <div className="flex justify-center">
                <QRCode value={reservation.qrCodeHash} size={250} level="H" />
              </div>
              <div className="mt-6 rounded-lg bg-blue-50 p-4">
                <p className="text-center text-sm text-blue-900">
                  Show this QR code to the seller during pickup
                </p>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">Verification Code (backup):</p>
                <p className="mt-2 text-3xl font-bold tracking-widest text-gray-900">
                  {reservation.verificationCode}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SellerView({ reservation }: { reservation: ReservationData }) {
  const depositPaid = reservation.status !== "PENDING";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
        <p className="text-sm text-purple-800">
          This is a read-only preview of what the seller sees.
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-lg p-4 ${
          reservation.status === "CONFIRMED"
            ? "bg-green-50 text-green-800"
            : reservation.status === "PENDING"
              ? "bg-yellow-50 text-yellow-800"
              : reservation.status === "COMPLETED"
                ? "bg-green-50 text-green-800"
                : "bg-gray-50 text-gray-800"
        }`}
      >
        <p className="font-medium">
          Status: {reservation.status.replace("_", " ")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Order Details */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-2 text-xl font-semibold">Order Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Listing:</span>
                <span className="font-medium">{reservation.listing.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">
                  {reservation.quantityReserved} units
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Amount to collect at pickup:</span>
                <span className="text-xl font-bold">
                  ${reservation.totalPrice.toFixed(2)} CAD
                </span>
              </div>
            </div>
          </div>

          {/* Buyer Info */}
          {depositPaid && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Buyer Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <p className="mt-1">{reservation.buyer.name || "No name"}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Contact:</span>
                  <p className="mt-1">{reservation.buyer.email}</p>
                  {reservation.buyer.phone && <p>{reservation.buyer.phone}</p>}
                </div>
                <div>
                  <span className="font-medium text-gray-600">Buyer Rating:</span>
                  <p className="mt-1">
                    {reservation.buyer.buyerRatingAverage?.toFixed(1) ?? "—"}{" "}
                    ({reservation.buyer.buyerRatingCount ?? 0} reviews)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Verification */}
        {depositPaid ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-center text-lg font-semibold">
                Verification Code
              </h3>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Ask the buyer for this code to verify pickup:
                </p>
                <p className="mt-4 text-4xl font-bold tracking-widest text-gray-900">
                  {reservation.verificationCode}
                </p>
              </div>
              <div className="mt-6 rounded-lg bg-green-50 p-4">
                <p className="text-center text-sm text-green-800">
                  Verify this code matches what the buyer shows you before handing
                  over items
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Pickup Instructions</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
                <li>
                  Ask the buyer for their verification code or scan their QR code
                </li>
                <li>
                  Collect the remaining balance of ${reservation.totalPrice.toFixed(2)}{" "}
                  CAD from the buyer
                </li>
                <li>Hand over the items</li>
                <li>Rate your experience with the buyer</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-yellow-800">
              Awaiting Payment
            </h3>
            <p className="text-sm text-yellow-700">
              The buyer has not yet paid the deposit for this reservation. You
              will be notified once payment is complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [perspective, setPerspective] = useState<ViewPerspective>("admin");

  const { data: session, isLoading: sessionLoading } =
    api.auth.getSession.useQuery();

  const { data: reservation, isLoading: reservationLoading } =
    api.admin.getReservationDetails.useQuery(
      { reservationId: id },
      { enabled: !!session?.user },
    );

  if (sessionLoading || reservationLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push(
      "/auth/signin?callbackUrl=" +
        encodeURIComponent(`/admin/reservations/${id}`),
    );
    return null;
  }

  if (!reservation) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Reservation not found</p>
        <Link
          href="/admin/reservations"
          className="mt-4 inline-block text-green-600 hover:text-green-800"
        >
          Back to Reservations
        </Link>
      </div>
    );
  }

  // Cast the reservation to our type (the API returns compatible data)
  const typedReservation = reservation as unknown as ReservationData;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/admin/reservations"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Reservations
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-sm text-gray-700">
              {typedReservation.verificationCode}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reservation Details
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Code: {typedReservation.verificationCode} | ID: {typedReservation.id.slice(0, 8)}...
          </p>
        </div>
        <PerspectiveToggle value={perspective} onChange={setPerspective} />
      </div>

      {/* View Content */}
      {perspective === "admin" && <AdminView reservation={typedReservation} />}
      {perspective === "buyer" && <BuyerView reservation={typedReservation} />}
      {perspective === "seller" && <SellerView reservation={typedReservation} />}
    </div>
  );
}
