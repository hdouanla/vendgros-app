"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { QRCode } from "@acme/ui/qr-code";

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();

  const { data: reservation, isLoading } = api.reservation.getById.useQuery({
    id,
  });

  const { data: paymentStatus } = api.payment.getPaymentStatus.useQuery(
    {
      reservationId: id,
    },
    {
      enabled: !!reservation,
    },
  );

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("errors.notFound")}</p>
      </div>
    );
  }

  const isExpired = new Date(reservation.expiresAt) < new Date();
  const isBuyer = true; // TODO: Check actual user session
  const depositPaid = paymentStatus?.depositPaid ?? false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("reservation.reservation")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("reservation.reservationCode")}: {reservation.verificationCode}
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`mb-6 rounded-lg p-4 ${
          reservation.status === "CONFIRMED"
            ? "bg-green-50 text-green-800"
            : reservation.status === "PENDING"
              ? "bg-yellow-50 text-yellow-800"
              : "bg-gray-50 text-gray-800"
        }`}
      >
        <p className="font-medium">
          {t(`reservation.status.${reservation.status.toLowerCase()}`)}
        </p>
        {isExpired && (
          <p className="mt-1 text-sm">
            This reservation has expired
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Listing Details */}
        <div className="space-y-6">
          {/* Listing Info */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {reservation.listing.title}
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("listing.quantity")}:</span>
                <span className="font-medium">
                  {reservation.quantityReserved} units
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  {t("reservation.totalPrice")}:
                </span>
                <span className="font-medium">
                  ${reservation.totalPrice.toFixed(2)} CAD
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">
                  {t("reservation.depositAmount")}:
                </span>
                <span className="font-medium text-green-600">
                  ${reservation.depositAmount.toFixed(2)} CAD
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">
                  {t("reservation.balanceDue")}:
                </span>
                <span className="text-xl font-bold">
                  ${(reservation.totalPrice - reservation.depositAmount).toFixed(2)}{" "}
                  CAD
                </span>
              </div>
            </div>

            {!depositPaid && isBuyer && (
              <button
                className="mt-6 w-full rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
                onClick={() => {
                  // TODO: Integrate Stripe payment
                  alert("Payment integration coming soon");
                }}
              >
                {t("reservation.payDeposit")}
              </button>
            )}
          </div>

          {/* Pickup Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-semibold">Pickup Details</h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-600">Address:</span>
                <p className="mt-1">{reservation.listing.pickupAddress}</p>
              </div>

              {reservation.listing.pickupInstructions && (
                <div>
                  <span className="font-medium text-gray-600">
                    Instructions:
                  </span>
                  <p className="mt-1">
                    {reservation.listing.pickupInstructions}
                  </p>
                </div>
              )}

              <div>
                <span className="font-medium text-gray-600">
                  Pickup Deadline:
                </span>
                <p className="mt-1">
                  {new Date(reservation.expiresAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Seller Info */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-semibold">
              {t("listing.seller")}
            </h3>

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Contact:</span>
                <p className="mt-1">{reservation.listing.seller.email}</p>
                <p>{reservation.listing.seller.phone}</p>
              </div>

              <div>
                <span className="font-medium text-gray-600">Rating:</span>
                <p className="mt-1">
                  ⭐{" "}
                  {reservation.listing.seller.ratingAverage?.toFixed(1) ?? "—"}{" "}
                  ({reservation.listing.seller.ratingCount} reviews)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - QR Code */}
        {depositPaid && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold text-center">
                {t("reservation.qrCode")}
              </h3>

              <div className="flex justify-center">
                <QRCode
                  value={reservation.qrCodeHash}
                  size={300}
                  level="H"
                />
              </div>

              <div className="mt-6 rounded-lg bg-blue-50 p-4">
                <p className="text-center text-sm text-blue-900">
                  {t("reservation.pickupInstructions")}
                </p>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Verification Code (backup):
                </p>
                <p className="mt-2 text-3xl font-bold tracking-widest text-gray-900">
                  {reservation.verificationCode}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Next Steps</h3>

              <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
                <li>
                  Show this QR code or verification code to the seller at pickup
                </li>
                <li>
                  Pay the balance of ${(reservation.totalPrice - reservation.depositAmount).toFixed(2)}{" "}
                  CAD in person
                </li>
                <li>Collect your items</li>
                <li>Rate your experience after pickup</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
