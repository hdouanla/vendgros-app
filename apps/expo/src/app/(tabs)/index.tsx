import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

const CATEGORIES = [
  "All",
  "GROCERIES",
  "CLOTHING",
  "ELECTRONICS",
  "HOME_GOODS",
  "TOYS",
  "SPORTS",
  "BOOKS",
  "OTHER",
];

export default function BrowseScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // Default to Toronto if permission denied
        setLocation({ latitude: 43.6532, longitude: -79.3832 });
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    })();
  }, []);

  // Search nearby listings
  const { data: listings, isLoading, refetch } = useQuery(
    trpc.listing.searchNearby.queryOptions({
      latitude: location?.latitude ?? 43.6532,
      longitude: location?.longitude ?? -79.3832,
      radiusKm: 25,
      category: selectedCategory === "All" ? undefined : selectedCategory,
      sortBy: "distance",
      limit: 50,
    }),
    {
      enabled: !!location,
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter listings by search query
  const filteredListings = listings?.filter((item) =>
    item.listing.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ title: "Browse Listings" }} />

      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Vendgros</Text>
        <Text className="text-sm text-gray-500">Find bulk items near you</Text>
      </View>

      {/* Search Bar */}
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <View className="flex-row items-center rounded-lg bg-gray-100 px-3 py-2">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="ml-2 flex-1 text-base text-gray-900"
            placeholder="Search listings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-gray-200 bg-white"
        contentContainerClassName="px-4 py-3"
      >
        {CATEGORIES.map((category) => (
          <Pressable
            key={category}
            onPress={() => setSelectedCategory(category)}
            className={`mr-2 rounded-full px-4 py-2 ${
              selectedCategory === category
                ? "bg-green-500"
                : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selectedCategory === category
                  ? "text-white"
                  : "text-gray-700"
              }`}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Listings */}
      {isLoading && !listings ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
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
          {filteredListings.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="sad-outline" size={48} color="#9ca3af" />
              <Text className="mt-4 text-center text-gray-500">
                No listings found in your area
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-400">
                Try adjusting your filters or check back later
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {filteredListings.map((item) => (
                <Pressable
                  key={item.listing.id}
                  onPress={() => router.push(`/listing/${item.listing.id}`)}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                >
                  {/* Image */}
                  {item.listing.photos && item.listing.photos.length > 0 ? (
                    <Image
                      source={{ uri: item.listing.photos[0] }}
                      className="h-48 w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-48 w-full items-center justify-center bg-gray-200">
                      <Ionicons name="image-outline" size={48} color="#9ca3af" />
                    </View>
                  )}

                  {/* Content */}
                  <View className="p-4">
                    {/* Category Badge */}
                    <View className="mb-2 self-start rounded-full bg-green-100 px-3 py-1">
                      <Text className="text-xs font-medium text-green-700">
                        {item.listing.category}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text className="text-lg font-semibold text-gray-900" numberOfLines={2}>
                      {item.listing.title}
                    </Text>

                    {/* Distance & Quantity */}
                    <View className="mt-2 flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name="location" size={16} color="#6b7280" />
                        <Text className="ml-1 text-sm text-gray-600">
                          {item.distance.toFixed(1)} km away
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-600">
                        {item.listing.quantityAvailable} available
                      </Text>
                    </View>

                    {/* Price */}
                    <View className="mt-3 flex-row items-baseline justify-between">
                      <View>
                        <Text className="text-2xl font-bold text-green-600">
                          ${item.listing.pricePerPiece.toFixed(2)}
                        </Text>
                        <Text className="text-xs text-gray-500">per piece</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-gray-500">Total {item.listing.quantityTotal} pieces</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
