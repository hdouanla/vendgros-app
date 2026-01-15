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
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user, isLoading } = useQuery(
    trpc.user.getCurrentUser.queryOptions()
  );

  // Get user stats
  const { data: buyerStats } = useQuery(
    trpc.user.getBuyerStats.queryOptions(),
    { enabled: !!user }
  );

  const { data: sellerStats } = useQuery(
    trpc.user.getSellerStats.queryOptions(),
    { enabled: !!user }
  );

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          // Clear auth and redirect
          // In a real app, you would call the auth logout endpoint
          Alert.alert("Logged Out", "You have been logged out successfully.");
        },
      },
    ]);
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@vendgros.com");
  };

  const handleViewTerms = () => {
    Linking.openURL("https://vendgros.com/terms");
  };

  const handleViewPrivacy = () => {
    Linking.openURL("https://vendgros.com/privacy");
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen options={{ title: "Profile" }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen options={{ title: "Profile" }} />
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
          <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
            Not Logged In
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Please log in to view your profile
          </Text>
          <Pressable
            onPress={() => Alert.alert("Login", "Login feature coming soon")}
            className="mt-6 rounded-lg bg-green-600 px-6 py-3"
          >
            <Text className="font-semibold text-white">Log In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ title: "Profile" }} />

      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-8">
          <View className="items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-green-100">
              <Text className="text-4xl font-bold text-green-700">
                {user.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="mt-4 text-xl font-bold text-gray-900">
              {user.email}
            </Text>
            {user.phone && (
              <Text className="mt-1 text-sm text-gray-500">{user.phone}</Text>
            )}
            <View className="mt-3 rounded-full bg-green-100 px-4 py-1">
              <Text className="text-xs font-medium text-green-700">
                {user.userType.replace("_", " ")}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        {(buyerStats || sellerStats) && (
          <View className="mx-4 mt-4 rounded-lg bg-white p-4">
            <Text className="mb-3 text-sm font-semibold text-gray-700">
              Your Activity
            </Text>
            <View className="flex-row gap-4">
              {buyerStats && (
                <View className="flex-1 rounded-lg bg-blue-50 p-3">
                  <Text className="text-2xl font-bold text-blue-700">
                    {buyerStats.totalOrders}
                  </Text>
                  <Text className="text-xs text-blue-600">Orders</Text>
                </View>
              )}
              {sellerStats && (
                <>
                  <View className="flex-1 rounded-lg bg-green-50 p-3">
                    <Text className="text-2xl font-bold text-green-700">
                      {sellerStats.activeListings}
                    </Text>
                    <Text className="text-xs text-green-600">Listings</Text>
                  </View>
                  <View className="flex-1 rounded-lg bg-purple-50 p-3">
                    <Text className="text-2xl font-bold text-purple-700">
                      {sellerStats.totalSales}
                    </Text>
                    <Text className="text-xs text-purple-600">Sales</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Ratings */}
        {user.ratingCount > 0 && (
          <View className="mx-4 mt-4 rounded-lg bg-white p-4">
            <Text className="mb-3 text-sm font-semibold text-gray-700">
              Your Rating
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="star" size={32} color="#fbbf24" />
              <Text className="ml-2 text-3xl font-bold text-gray-900">
                {user.ratingAverage?.toFixed(1) || "0.0"}
              </Text>
              <Text className="ml-2 text-sm text-gray-500">
                ({user.ratingCount} {user.ratingCount === 1 ? "review" : "reviews"})
              </Text>
            </View>
          </View>
        )}

        {/* Account Settings */}
        <View className="mx-4 mt-4 rounded-lg bg-white">
          <Text className="px-4 pt-4 text-sm font-semibold text-gray-700">
            Account Settings
          </Text>

          <Pressable
            onPress={() => Alert.alert("Edit Profile", "Feature coming soon")}
            className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-base text-gray-900">
                Edit Profile
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Payment Methods", "Feature coming soon")}
            className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="card-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-base text-gray-900">
                Payment Methods
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Notification Settings", "Feature coming soon")}
            className="flex-row items-center justify-between px-4 py-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-base text-gray-900">
                Notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Support & Legal */}
        <View className="mx-4 mt-4 rounded-lg bg-white">
          <Text className="px-4 pt-4 text-sm font-semibold text-gray-700">
            Support & Legal
          </Text>

          <Pressable
            onPress={handleContactSupport}
            className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="help-circle-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-base text-gray-900">
                Contact Support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          <Pressable
            onPress={handleViewTerms}
            className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="document-text-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-base text-gray-900">
                Terms of Service
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          <Pressable
            onPress={handleViewPrivacy}
            className="flex-row items-center justify-between px-4 py-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-base text-gray-900">
                Privacy Policy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View className="mx-4 mt-4 mb-6 rounded-lg bg-white">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center px-4 py-4"
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="ml-2 text-base font-semibold text-red-600">
              Log Out
            </Text>
          </Pressable>
        </View>

        {/* App Version */}
        <View className="items-center pb-8">
          <Text className="text-xs text-gray-400">Vendgros v1.0.0</Text>
          <Text className="mt-1 text-xs text-gray-400">
            Built with T3 Stack + Expo
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
