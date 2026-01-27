import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState("1");
  const [showReserveModal, setShowReserveModal] = useState(false);

  // Fetch listing details
  const { data: listing, isLoading } = useQuery(
    trpc.listing.getById.queryOptions({ id: id! }),
    {
      enabled: !!id,
    }
  );

  // Create reservation mutation
  const createReservation = useMutation(
    trpc.reservation.create.mutationOptions({
      onSuccess: (data) => {
        setShowReserveModal(false);
        Alert.alert(
          "Reservation Created!",
          "Your reservation has been created. Please proceed to payment.",
          [
            {
              text: "OK",
              onPress: () => router.push(`/reservation/${data.id}`),
            },
          ]
        );
      },
      onError: (error) => {
        Alert.alert("Error", error.message);
      },
    })
  );

  // Track view
  const trackView = useMutation(
    trpc.listing.trackView.mutationOptions()
  );

  // Track view when screen loads
  useState(() => {
    if (id) {
      trackView.mutate({ listingId: id });
    }
  });

  if (isLoading || !listing) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  const quantityNum = parseInt(quantity) || 1;
  const depositAmount = listing.pricePerPiece * quantityNum * 0.05;
  const totalPrice = listing.pricePerPiece * quantityNum;
  const displayedTotal = totalPrice * 1.05; // Inflated price shown to buyer
  const balanceDue = totalPrice; // Seller's price (what buyer pays at pickup)

  const handleReserve = () => {
    if (quantityNum < 1 || quantityNum > listing.quantityAvailable) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity");
      return;
    }

    createReservation.mutate({
      listingId: listing.id,
      quantityReserved: quantityNum,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Listing Details",
          headerBackTitle: "Back",
        }}
      />

      <ScrollView className="flex-1">
        {/* Image Gallery */}
        {listing.photos && listing.photos.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {listing.photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo }}
                className="h-80 w-screen"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <View className="h-80 w-full items-center justify-center bg-gray-200">
            <Ionicons name="image-outline" size={64} color="#9ca3af" />
          </View>
        )}

        {/* Content */}
        <View className="p-4">
          {/* Category Badge */}
          <View className="mb-3 self-start rounded-full bg-green-100 px-3 py-1">
            <Text className="text-xs font-medium text-green-700">
              {listing.category}
            </Text>
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900">
            {listing.title}
          </Text>

          {/* Price */}
          <View className="mt-4 flex-row items-baseline">
            <Text className="text-3xl font-bold text-green-600">
              ${(listing.pricePerPiece * 1.05).toFixed(2)}
            </Text>
            <Text className="ml-2 text-base text-gray-600">per piece</Text>
          </View>

          {/* Availability */}
          <View className="mt-4 rounded-lg bg-gray-50 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">
                Available Quantity
              </Text>
              <Text className="text-lg font-bold text-gray-900">
                {listing.quantityAvailable} / {listing.quantityTotal}
              </Text>
            </View>
            {listing.maxPerBuyer && (
              <Text className="mt-2 text-xs text-gray-500">
                Max {listing.maxPerBuyer} per buyer
              </Text>
            )}
          </View>

          {/* Description */}
          <View className="mt-6">
            <Text className="mb-2 text-lg font-semibold text-gray-900">
              Description
            </Text>
            <Text className="leading-6 text-gray-700">
              {listing.description}
            </Text>
          </View>

          {/* Pickup Location */}
          <View className="mt-6">
            <Text className="mb-2 text-lg font-semibold text-gray-900">
              Pickup Location
            </Text>
            <View className="flex-row items-start">
              <Ionicons name="location" size={20} color="#10b981" />
              <Text className="ml-2 flex-1 leading-6 text-gray-700">
                {listing.pickupAddress}
              </Text>
            </View>
            {listing.pickupInstructions && (
              <View className="mt-3 rounded-lg bg-blue-50 p-3">
                <Text className="text-sm font-medium text-blue-900">
                  Pickup Instructions:
                </Text>
                <Text className="mt-1 text-sm text-blue-800">
                  {listing.pickupInstructions}
                </Text>
              </View>
            )}
          </View>

          {/* Seller Info */}
          <View className="mt-6 rounded-lg border border-gray-200 p-4">
            <Text className="mb-2 text-base font-semibold text-gray-900">
              Seller Information
            </Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-gray-600">Verification</Text>
                <Text className="text-base font-medium text-gray-900">
                  {listing.seller.verificationBadge === "NONE" ? "Standard" : listing.seller.verificationBadge}
                </Text>
              </View>
              {listing.seller.sellerRatingCount > 0 && (
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    <Text className="ml-1 text-base font-semibold text-gray-900">
                      {listing.seller.sellerRatingAverage?.toFixed(1)}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {listing.seller.sellerRatingCount} seller reviews
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Spacer for bottom button */}
          <View className="h-32" />
        </View>
      </ScrollView>

      {/* Reserve Button (Fixed at bottom) */}
      {listing.status === "PUBLISHED" && listing.quantityAvailable > 0 && (
        <View className="border-t border-gray-200 bg-white px-4 py-4">
          <Pressable
            onPress={() => setShowReserveModal(true)}
            className="w-full rounded-lg bg-green-600 py-4"
          >
            <Text className="text-center text-lg font-semibold text-white">
              Reserve Now
            </Text>
          </Pressable>
        </View>
      )}

      {/* Reserve Modal */}
      <Modal
        visible={showReserveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReserveModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white p-6">
            <Text className="mb-4 text-xl font-bold text-gray-900">
              Reserve Listing
            </Text>

            {/* Quantity Input */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Quantity
              </Text>
              <TextInput
                className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Enter quantity"
              />
            </View>

            {/* Price Breakdown */}
            <View className="mb-6 rounded-lg bg-gray-50 p-4">
              <View className="flex-row justify-between">
                <Text className="text-gray-700">
                  Price per piece:
                </Text>
                <Text className="font-medium text-gray-900">
                  ${(listing.pricePerPiece * 1.05).toFixed(2)}
                </Text>
              </View>
              <View className="mt-2 flex-row justify-between">
                <Text className="text-gray-700">Quantity:</Text>
                <Text className="font-medium text-gray-900">{quantityNum}</Text>
              </View>
              <View className="my-2 border-t border-gray-200" />
              <View className="flex-row justify-between">
                <Text className="text-gray-700">Total Price:</Text>
                <Text className="font-semibold text-gray-900">
                  ${displayedTotal.toFixed(2)}
                </Text>
              </View>
              <View className="mt-2 flex-row justify-between">
                <Text className="text-sm text-gray-600">
                  Deposit:
                </Text>
                <Text className="text-sm font-medium text-green-600">
                  ${depositAmount.toFixed(2)}
                </Text>
              </View>
              <View className="mt-1 flex-row justify-between">
                <Text className="text-sm text-gray-600">
                  Balance due at pickup:
                </Text>
                <Text className="text-sm font-medium text-gray-600">
                  ${balanceDue.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowReserveModal(false)}
                className="flex-1 rounded-lg border border-gray-300 py-3"
              >
                <Text className="text-center font-semibold text-gray-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleReserve}
                disabled={createReservation.isPending}
                className="flex-1 rounded-lg bg-green-600 py-3"
              >
                <Text className="text-center font-semibold text-white">
                  {createReservation.isPending ? "Processing..." : "Confirm"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
