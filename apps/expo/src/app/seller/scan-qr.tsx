import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, Camera } from "expo-camera";
import { useMutation } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function ScanQRScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  // Complete pickup mutation
  const completePickup = useMutation(
    trpc.reservation.completePickup.mutationOptions({
      onSuccess: (data) => {
        Alert.alert(
          "Pickup Completed!",
          `Successfully completed pickup for ${data.listing.title}.\n\nQuantity: ${data.quantityReserved}\nAmount: $${data.totalPrice.toFixed(2)}`,
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      },
      onError: (error) => {
        Alert.alert("Error", error.message, [
          {
            text: "Try Again",
            onPress: () => setScanned(false),
          },
        ]);
      },
    })
  );

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Verify it's a 6-digit code
    if (!/^\d{6}$/.test(data)) {
      Alert.alert(
        "Invalid QR Code",
        "This doesn't appear to be a valid Vendgros verification code. Please scan a customer's order QR code.",
        [
          {
            text: "Try Again",
            onPress: () => setScanned(false),
          },
        ]
      );
      return;
    }

    // Complete the pickup
    completePickup.mutate({ verificationCode: data });
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Scan QR Code",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-gray-600">Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Scan QR Code",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="camera-off" size={64} color="#9ca3af" />
          <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
            Camera Permission Required
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Please enable camera access in your device settings to scan QR codes.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 rounded-lg bg-green-600 px-6 py-3"
          >
            <Text className="font-semibold text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Scan QR Code",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#000" },
          headerTintColor: "#fff",
        }}
      />

      <View style={StyleSheet.absoluteFillObject}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          enableTorch={flashOn}
        />

        {/* Overlay */}
        <View className="flex-1">
          {/* Top overlay */}
          <View className="flex-1 bg-black/50" />

          {/* Scanner area */}
          <View className="h-72 flex-row">
            <View className="flex-1 bg-black/50" />
            <View className="w-72 border-2 border-white">
              {/* Corner decorations */}
              <View className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-green-500" />
              <View className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-green-500" />
              <View className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-green-500" />
              <View className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-green-500" />
            </View>
            <View className="flex-1 bg-black/50" />
          </View>

          {/* Bottom overlay */}
          <View className="flex-1 items-center justify-center bg-black/50">
            <Text className="px-6 text-center text-lg font-semibold text-white">
              {scanned
                ? "Processing..."
                : "Position the QR code within the frame"}
            </Text>
            <Text className="mt-2 px-6 text-center text-sm text-gray-300">
              {scanned
                ? "Please wait while we verify the code"
                : "Ask the customer to show their order QR code"}
            </Text>

            {/* Flash Toggle */}
            <Pressable
              onPress={() => setFlashOn(!flashOn)}
              className="mt-6 rounded-full bg-white/20 p-4"
            >
              <Ionicons
                name={flashOn ? "flash" : "flash-off"}
                size={32}
                color="white"
              />
            </Pressable>
          </View>
        </View>

        {/* Loading Overlay */}
        {completePickup.isPending && (
          <View
            style={StyleSheet.absoluteFillObject}
            className="items-center justify-center bg-black/70"
          >
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="mt-4 text-lg font-semibold text-white">
              Completing Pickup...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
