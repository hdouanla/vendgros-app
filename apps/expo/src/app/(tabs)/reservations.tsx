import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
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

export default function ReservationsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's reservations
  const { data: reservations, isLoading, refetch } = useQuery(
    trpc.reservation.listMyReservations.queryOptions({
      limit: 50,
    })
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen options={{ title: "My Orders" }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ title: "My Orders" }} />

      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">My Orders</Text>
        <Text className="text-sm text-gray-500">
          {reservations?.length || 0} reservation{reservations?.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {!reservations || reservations.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
            <Text className="mt-4 text-center text-lg font-medium text-gray-900">
              No Orders Yet
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              When you reserve items, they'll appear here
            </Text>
            <Pressable
              onPress={() => router.push("/")}
              className="mt-6 rounded-lg bg-green-600 px-6 py-3"
            >
              <Text className="font-semibold text-white">Browse Listings</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-4">
            {reservations.map((reservation) => {
              const statusConfig = STATUS_CONFIG[reservation.status];
              const depositPaid = reservation.depositAmount > 0;
              const displayedTotal = reservation.totalPrice * 1.05; // Inflated price shown to buyer
              const balanceDue = reservation.totalPrice; // Seller's price (what buyer pays at pickup)

              return (
                <Pressable
                  key={reservation.id}
                  onPress={() => router.push(`/reservation/${reservation.id}`)}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                >
                  {/* Status Badge */}
                  <View
                    className={`flex-row items-center justify-between px-4 py-2 ${statusConfig.color}`}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={statusConfig.icon}
                        size={20}
                        color={statusConfig.textColor.includes("yellow") ? "#b45309" :
                               statusConfig.textColor.includes("green") ? "#15803d" :
                               statusConfig.textColor.includes("blue") ? "#1e40af" :
                               statusConfig.textColor.includes("red") ? "#b91c1c" : "#374151"}
                      />
                      <Text
                        className={`ml-2 text-sm font-semibold ${statusConfig.textColor}`}
                      >
                        {statusConfig.label}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      {new Date(reservation.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View className="p-4">
                    {/* Listing Info */}
                    <View className="flex-row">
                      {reservation.listing.photos &&
                      reservation.listing.photos.length > 0 ? (
                        <Image
                          source={{ uri: reservation.listing.photos[0] }}
                          className="h-20 w-20 rounded-lg"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-20 w-20 items-center justify-center rounded-lg bg-gray-200">
                          <Ionicons
                            name="image-outline"
                            size={32}
                            color="#9ca3af"
                          />
                        </View>
                      )}

                      <View className="ml-3 flex-1">
                        <Text
                          className="text-base font-semibold text-gray-900"
                          numberOfLines={2}
                        >
                          {reservation.listing.title}
                        </Text>
                        <View className="mt-1 flex-row items-center">
                          <Ionicons name="cube" size={14} color="#6b7280" />
                          <Text className="ml-1 text-sm text-gray-600">
                            Qty: {reservation.quantityReserved}
                          </Text>
                        </View>
                        <View className="mt-1 flex-row items-center">
                          <Ionicons name="location" size={14} color="#6b7280" />
                          <Text
                            className="ml-1 flex-1 text-xs text-gray-500"
                            numberOfLines={1}
                          >
                            {reservation.listing.pickupAddress}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* QR Code for Confirmed Reservations */}
                    {reservation.status === "CONFIRMED" && (
                      <View className="mt-4 items-center rounded-lg bg-gray-50 p-4">
                        <Text className="mb-3 text-sm font-medium text-gray-700">
                          Show this code to the seller
                        </Text>
                        <QRCode
                          value={reservation.verificationCode}
                          size={120}
                          backgroundColor="white"
                        />
                        <Text className="mt-3 text-2xl font-bold tracking-widest text-gray-900">
                          {reservation.verificationCode}
                        </Text>
                      </View>
                    )}

                    {/* Price Info */}
                    <View className="mt-4 border-t border-gray-200 pt-3">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-gray-600">
                          Total Price:
                        </Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          ${displayedTotal.toFixed(2)}
                        </Text>
                      </View>
                      {depositPaid && (
                        <>
                          <View className="mt-1 flex-row justify-between">
                            <Text className="text-sm text-gray-600">
                              Deposit Paid:
                            </Text>
                            <Text className="text-sm font-medium text-green-600">
                              ${reservation.depositAmount.toFixed(2)}
                            </Text>
                          </View>
                          {balanceDue > 0 && (
                            <View className="mt-1 flex-row justify-between">
                              <Text className="text-sm text-gray-600">
                                Balance Due:
                              </Text>
                              <Text className="text-sm font-medium text-orange-600">
                                ${balanceDue.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>

                    {/* Action Hint */}
                    {reservation.status === "PENDING" && (
                      <View className="mt-3 rounded-lg bg-yellow-50 p-3">
                        <Text className="text-xs text-yellow-800">
                          Complete payment to confirm your reservation
                        </Text>
                      </View>
                    )}
                    {reservation.status === "CONFIRMED" && (
                      <View className="mt-3 rounded-lg bg-blue-50 p-3">
                        <Text className="text-xs text-blue-800">
                          Ready for pickup - Show QR code to seller
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
