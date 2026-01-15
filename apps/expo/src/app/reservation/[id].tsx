import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";

import { trpc } from "~/utils/api";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending Payment",
    color: "bg-yellow-100",
    textColor: "text-yellow-700",
    icon: "time" as const,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-green-100",
    textColor: "text-green-700",
    icon: "checkmark-circle" as const,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-blue-100",
    textColor: "text-blue-700",
    icon: "checkmark-done-circle" as const,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100",
    textColor: "text-red-700",
    icon: "close-circle" as const,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-gray-100",
    textColor: "text-gray-700",
    icon: "alert-circle" as const,
  },
};

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch reservation details
  const { data: reservation, isLoading } = useQuery(
    trpc.reservation.getById.queryOptions({ id: id! }),
    { enabled: !!id }
  );

  // Cancel reservation mutation
  const cancelReservation = useMutation(
    trpc.reservation.cancel.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["reservation"] });
        Alert.alert(
          "Reservation Cancelled",
          "Your reservation has been cancelled. Any deposit paid will be refunded according to our policy.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      },
      onError: (error) => {
        Alert.alert("Error", error.message);
      },
    })
  );

  const handleCancelReservation = () => {
    Alert.alert(
      "Cancel Reservation",
      "Are you sure you want to cancel this reservation? This action cannot be undone.",
      [
        {
          text: "No, Keep It",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            if (reservation) {
              cancelReservation.mutate({ reservationId: reservation.id });
            }
          },
        },
      ]
    );
  };

  const handleContactSeller = () => {
    if (reservation?.seller.phone) {
      Linking.openURL(`tel:${reservation.seller.phone}`);
    } else {
      Alert.alert("Contact Seller", "Seller contact info not available");
    }
  };

  const handleGetDirections = () => {
    if (reservation) {
      const address = encodeURIComponent(reservation.listing.pickupAddress);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  };

  if (isLoading || !reservation) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Order Details",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[reservation.status];
  const depositPaid = reservation.depositAmount > 0;
  const balanceDue = reservation.totalPrice - reservation.depositAmount;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Order Details",
          headerBackTitle: "Back",
        }}
      />

      <ScrollView className="flex-1">
        {/* Status Header */}
        <View className={`px-6 py-4 ${statusConfig.color}`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name={statusConfig.icon}
                size={24}
                color={
                  statusConfig.textColor.includes("yellow")
                    ? "#b45309"
                    : statusConfig.textColor.includes("green")
                      ? "#15803d"
                      : statusConfig.textColor.includes("blue")
                        ? "#1e40af"
                        : statusConfig.textColor.includes("red")
                          ? "#b91c1c"
                          : "#374151"
                }
              />
              <Text
                className={`ml-2 text-lg font-bold ${statusConfig.textColor}`}
              >
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text className="mt-2 text-sm text-gray-600">
            Order placed: {new Date(reservation.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* QR Code (for confirmed orders) */}
        {reservation.status === "CONFIRMED" && (
          <View className="mx-6 mt-6 items-center rounded-lg border-2 border-green-500 bg-green-50 p-6">
            <Text className="mb-4 text-center text-base font-semibold text-gray-900">
              Show this to the seller at pickup
            </Text>
            <QRCode
              value={reservation.verificationCode}
              size={200}
              backgroundColor="white"
            />
            <Text className="mt-4 text-3xl font-bold tracking-widest text-gray-900">
              {reservation.verificationCode}
            </Text>
            <Text className="mt-2 text-center text-xs text-gray-500">
              6-digit verification code
            </Text>
          </View>
        )}

        {/* Listing Details */}
        <View className="mx-6 mt-6">
          <Text className="mb-3 text-lg font-bold text-gray-900">
            Item Details
          </Text>
          <View className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Text className="text-xl font-semibold text-gray-900">
              {reservation.listing.title}
            </Text>
            <View className="mt-3 flex-row items-center">
              <Ionicons name="cube" size={18} color="#6b7280" />
              <Text className="ml-2 text-base text-gray-700">
                Quantity: {reservation.quantityReserved}
              </Text>
            </View>
            <View className="mt-2 flex-row items-baseline">
              <Text className="text-2xl font-bold text-green-600">
                ${reservation.listing.pricePerPiece.toFixed(2)}
              </Text>
              <Text className="ml-2 text-sm text-gray-500">per piece</Text>
            </View>
          </View>
        </View>

        {/* Pricing Breakdown */}
        <View className="mx-6 mt-6">
          <Text className="mb-3 text-lg font-bold text-gray-900">
            Price Breakdown
          </Text>
          <View className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <View className="flex-row justify-between">
              <Text className="text-gray-700">
                {reservation.quantityReserved} × $
                {reservation.listing.pricePerPiece.toFixed(2)}
              </Text>
              <Text className="font-medium text-gray-900">
                ${reservation.totalPrice.toFixed(2)}
              </Text>
            </View>

            {depositPaid && (
              <>
                <View className="my-3 border-t border-gray-300" />
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-600">
                    Deposit Paid (5%):
                  </Text>
                  <Text className="text-sm font-medium text-green-600">
                    ${reservation.depositAmount.toFixed(2)}
                  </Text>
                </View>
                {balanceDue > 0 && (
                  <View className="mt-2 flex-row justify-between">
                    <Text className="text-sm font-semibold text-gray-700">
                      Balance Due at Pickup:
                    </Text>
                    <Text className="text-sm font-bold text-orange-600">
                      ${balanceDue.toFixed(2)}
                    </Text>
                  </View>
                )}
              </>
            )}

            <View className="my-3 border-t-2 border-gray-400" />
            <View className="flex-row justify-between">
              <Text className="text-lg font-bold text-gray-900">
                Total Price:
              </Text>
              <Text className="text-lg font-bold text-gray-900">
                ${reservation.totalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Pickup Information */}
        <View className="mx-6 mt-6">
          <Text className="mb-3 text-lg font-bold text-gray-900">
            Pickup Location
          </Text>
          <View className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <View className="flex-row items-start">
              <Ionicons name="location" size={20} color="#10b981" />
              <Text className="ml-2 flex-1 text-base text-gray-900">
                {reservation.listing.pickupAddress}
              </Text>
            </View>

            {reservation.listing.pickupInstructions && (
              <View className="mt-3 rounded-lg bg-blue-50 p-3">
                <Text className="text-sm font-medium text-blue-900">
                  Pickup Instructions:
                </Text>
                <Text className="mt-1 text-sm text-blue-800">
                  {reservation.listing.pickupInstructions}
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleGetDirections}
              className="mt-4 flex-row items-center justify-center rounded-lg bg-green-600 py-3"
            >
              <Ionicons name="navigate" size={20} color="white" />
              <Text className="ml-2 font-semibold text-white">
                Get Directions
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Seller Information */}
        <View className="mx-6 mt-6">
          <Text className="mb-3 text-lg font-bold text-gray-900">
            Seller Information
          </Text>
          <View className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-medium text-gray-900">
                  {reservation.seller.userType.replace("_", " ")}
                </Text>
                {reservation.seller.ratingCount > 0 && (
                  <View className="mt-1 flex-row items-center">
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    <Text className="ml-1 text-sm text-gray-700">
                      {reservation.seller.ratingAverage?.toFixed(1)} (
                      {reservation.seller.ratingCount} reviews)
                    </Text>
                  </View>
                )}
              </View>
              {reservation.seller.phone && (
                <Pressable
                  onPress={handleContactSeller}
                  className="rounded-lg bg-green-600 px-4 py-2"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="call" size={16} color="white" />
                    <Text className="ml-1 text-sm font-semibold text-white">
                      Call
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        {reservation.status === "PENDING" && (
          <View className="mx-6 mt-6">
            <Pressable
              onPress={() =>
                Alert.alert("Payment", "Redirect to payment page coming soon")
              }
              className="rounded-lg bg-green-600 py-4"
            >
              <Text className="text-center text-lg font-semibold text-white">
                Complete Payment
              </Text>
            </Pressable>
          </View>
        )}

        {(reservation.status === "PENDING" ||
          reservation.status === "CONFIRMED") && (
          <View className="mx-6 mt-4 mb-6">
            <Pressable
              onPress={handleCancelReservation}
              disabled={cancelReservation.isPending}
              className="rounded-lg border border-red-500 bg-white py-4"
            >
              <Text className="text-center text-lg font-semibold text-red-600">
                {cancelReservation.isPending
                  ? "Cancelling..."
                  : "Cancel Reservation"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Spacer */}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
