import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user, isLoading } = useQuery(
    trpc.user.getCurrentUser.queryOptions()
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [languagePreference, setLanguagePreference] = useState<"en" | "fr" | "es">("en");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with current user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
      setLanguagePreference(user.languagePreference as "en" | "fr" | "es");
    }
  }, [user]);

  const updateProfileMutation = useMutation(
    trpc.user.updateProfile.mutationOptions({
      onSuccess: () => {
        setIsSaving(false);
        void queryClient.invalidateQueries({ queryKey: [["user", "getCurrentUser"]] });
        Alert.alert("Success", "Profile updated successfully!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      },
      onError: (error) => {
        setIsSaving(false);
        Alert.alert("Error", error.message || "Failed to update profile");
      },
    })
  );

  const handleSave = () => {
    // Validate
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    // Format phone number if provided
    let formattedPhone: string | null = null;
    if (phone.trim()) {
      // Remove all non-digits
      const digits = phone.replace(/\D/g, "");
      if (digits.length === 10) {
        formattedPhone = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith("1")) {
        formattedPhone = `+${digits}`;
      } else {
        Alert.alert("Error", "Please enter a valid 10-digit phone number");
        return;
      }
    }

    setIsSaving(true);
    updateProfileMutation.mutate({
      name: name.trim(),
      phone: formattedPhone,
      languagePreference,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: "Edit Profile",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: "Edit Profile",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-center text-gray-500">
            Please log in to edit your profile
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const languages = [
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
    { value: "es", label: "Español" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Edit Profile",
          headerBackTitle: "Back",
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="mr-2"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Text className="text-base font-semibold text-green-600">
                  Save
                </Text>
              )}
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          {/* Profile Photo Placeholder */}
          <View className="items-center bg-white py-6">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-green-100">
              <Text className="text-4xl font-bold text-green-700">
                {name.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="mt-2 text-xs text-gray-500">
              Profile photo coming soon
            </Text>
          </View>

          {/* Form Fields */}
          <View className="mt-4 bg-white px-4 py-2">
            {/* Name Field */}
            <View className="border-b border-gray-100 py-4">
              <Text className="mb-2 text-sm font-medium text-gray-500">
                Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                className="text-base text-gray-900"
                autoCapitalize="words"
              />
            </View>

            {/* Email Field (Read-only) */}
            <View className="border-b border-gray-100 py-4">
              <Text className="mb-2 text-sm font-medium text-gray-500">
                Email
              </Text>
              <Text className="text-base text-gray-400">{user.email}</Text>
              <Text className="mt-1 text-xs text-gray-400">
                Contact support to change email
              </Text>
            </View>

            {/* Phone Field */}
            <View className="border-b border-gray-100 py-4">
              <Text className="mb-2 text-sm font-medium text-gray-500">
                Phone Number
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 555-5555"
                className="text-base text-gray-900"
                keyboardType="phone-pad"
              />
              <Text className="mt-1 text-xs text-gray-400">
                Canadian phone number for SMS notifications
              </Text>
            </View>

            {/* Language Preference */}
            <View className="py-4">
              <Text className="mb-2 text-sm font-medium text-gray-500">
                Language Preference
              </Text>
              <View className="flex-row gap-2">
                {languages.map((lang) => (
                  <Pressable
                    key={lang.value}
                    onPress={() => setLanguagePreference(lang.value as "en" | "fr" | "es")}
                    className={`flex-1 rounded-lg border py-3 ${
                      languagePreference === lang.value
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-medium ${
                        languagePreference === lang.value
                          ? "text-green-700"
                          : "text-gray-600"
                      }`}
                    >
                      {lang.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Account Info */}
          <View className="mt-4 bg-white px-4 py-4">
            <Text className="mb-3 text-sm font-semibold text-gray-700">
              Account Information
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Email Verified</Text>
                <Text
                  className={`text-sm font-medium ${
                    user.emailVerified ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {user.emailVerified ? "Yes" : "No"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Verification Badge</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {user.verificationBadge === "NONE" ? "Standard" : user.verificationBadge}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Account Status</Text>
                <Text className="text-sm font-medium text-green-600">
                  {user.accountStatus}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Member Since</Text>
                <Text className="text-sm font-medium text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button (Alternative for Android) */}
          <View className="mx-4 mt-6 mb-8">
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className={`rounded-lg py-4 ${
                isSaving ? "bg-green-400" : "bg-green-600"
              }`}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center text-lg font-semibold text-white">
                  Save Changes
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
