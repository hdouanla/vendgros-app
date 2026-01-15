import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100",
    textColor: "text-gray-700",
    icon: "document-outline" as const,
  },
  PENDING_REVIEW: {
    label: "Under Review",
    color: "bg-yellow-100",
    textColor: "text-yellow-700",
    icon: "time-outline" as const,
  },
  PUBLISHED: {
    label: "Published",
    color: "bg-green-100",
    textColor: "text-green-700",
    icon: "checkmark-circle" as const,
  },
  SOLD_OUT: {
    label: "Sold Out",
    color: "bg-blue-100",
    textColor: "text-blue-700",
    icon: "pricetag" as const,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-red-100",
    textColor: "text-red-700",
    icon: "alert-circle" as const,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100",
    textColor: "text-red-700",
    icon: "close-circle" as const,
  },
};

export default function SellerScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch seller's listings
  const { data: listings, isLoading, refetch } = useQuery(
    trpc.listing.listMyListings.queryOptions({
      limit: 50,
    })
  );

  // Get pending reservations count
  const { data: reservations } = useQuery(
    trpc.reservation.listSellerReservations.queryOptions({
      status: "CONFIRMED",
      limit: 100,
    })
  );

  const pendingPickups = reservations?.length || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleScanQR = () => {
    router.push("/seller/scan-qr");
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen options={{ title: "Seller Dashboard" }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  const activeListings = listings?.filter(
    (l) => l.status === "PUBLISHED"
  ).length || 0;
  const draftListings = listings?.filter(
    (l) => l.status === "DRAFT"
  ).length || 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ title: "Seller Dashboard" }} />

      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">
          Seller Dashboard
        </Text>
        <Text className="text-sm text-gray-500">
          Manage your listings and orders
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
        {/* Stats Cards */}
        <View className="mb-6 flex-row gap-3">
          <View className="flex-1 rounded-lg bg-green-50 p-4">
            <Text className="text-2xl font-bold text-green-700">
              {activeListings}
            </Text>
            <Text className="text-xs text-green-600">Active Listings</Text>
          </View>
          <View className="flex-1 rounded-lg bg-orange-50 p-4">
            <Text className="text-2xl font-bold text-orange-700">
              {pendingPickups}
            </Text>
            <Text className="text-xs text-orange-600">Pending Pickups</Text>
          </View>
          <View className="flex-1 rounded-lg bg-gray-50 p-4">
            <Text className="text-2xl font-bold text-gray-700">
              {draftListings}
            </Text>
            <Text className="text-xs text-gray-600">Drafts</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-6 gap-3">
          <Pressable
            onPress={handleScanQR}
            className="flex-row items-center justify-between rounded-lg bg-green-600 p-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="qr-code-outline" size={24} color="white" />
              <Text className="ml-3 text-lg font-semibold text-white">
                Scan QR Code
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Create Listing", "Feature coming soon - use web app to create listings")}
            className="flex-row items-center justify-between rounded-lg border-2 border-green-600 bg-white p-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="add-circle-outline" size={24} color="#10b981" />
              <Text className="ml-3 text-lg font-semibold text-green-700">
                Create New Listing
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#10b981" />
          </Pressable>
        </View>

        {/* Listings */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900">My Listings</Text>
          <Text className="text-sm text-gray-500">
            {listings?.length || 0} total
          </Text>
        </View>

        {!listings || listings.length === 0 ? (
          <View className="items-center rounded-lg border border-dashed border-gray-300 py-12">
            <Ionicons name="storefront-outline" size={64} color="#9ca3af" />
            <Text className="mt-4 text-center text-lg font-medium text-gray-900">
              No Listings Yet
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Create your first listing to start selling
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {listings.map((listing) => {
              const statusConfig = STATUS_CONFIG[listing.status];
              const reservationCount = listing.quantityTotal - listing.quantityAvailable;

              return (
                <Pressable
                  key={listing.id}
                  onPress={() => router.push(`/listing/${listing.id}`)}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                >
                  {/* Status Bar */}
                  <View
                    className={`flex-row items-center justify-between px-4 py-2 ${statusConfig.color}`}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={statusConfig.icon}
                        size={16}
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
                        className={`ml-2 text-xs font-semibold ${statusConfig.textColor}`}
                      >
                        {statusConfig.label}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View className="flex-row p-4">
                    {/* Image */}
                    {listing.photos && listing.photos.length > 0 ? (
                      <Image
                        source={{ uri: listing.photos[0] }}
                        className="h-24 w-24 rounded-lg"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-24 w-24 items-center justify-center rounded-lg bg-gray-200">
                        <Ionicons
                          name="image-outline"
                          size={32}
                          color="#9ca3af"
                        />
                      </View>
                    )}

                    {/* Info */}
                    <View className="ml-3 flex-1">
                      <Text
                        className="text-base font-semibold text-gray-900"
                        numberOfLines={2}
                      >
                        {listing.title}
                      </Text>

                      <View className="mt-2 flex-row items-center">
                        <Text className="text-lg font-bold text-green-600">
                          ${listing.pricePerPiece.toFixed(2)}
                        </Text>
                        <Text className="ml-1 text-xs text-gray-500">
                          per piece
                        </Text>
                      </View>

                      <View className="mt-2 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="cube" size={14} color="#6b7280" />
                          <Text className="ml-1 text-xs text-gray-600">
                            {listing.quantityAvailable} / {listing.quantityTotal} available
                          </Text>
                        </View>
                      </View>

                      {listing.status === "PUBLISHED" && reservationCount > 0 && (
                        <View className="mt-2 flex-row items-center">
                          <Ionicons
                            name="people"
                            size={14}
                            color="#10b981"
                          />
                          <Text className="ml-1 text-xs font-medium text-green-600">
                            {reservationCount} reserved
                          </Text>
                        </View>
                      )}

                      {listing.viewCount > 0 && (
                        <View className="mt-1 flex-row items-center">
                          <Ionicons name="eye" size={14} color="#6b7280" />
                          <Text className="ml-1 text-xs text-gray-500">
                            {listing.viewCount} views
                          </Text>
                        </View>
                      )}
                    </View>
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
