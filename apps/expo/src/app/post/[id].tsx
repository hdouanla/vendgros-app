import { SafeAreaView, Text, View } from "react-native";
import { Stack, useGlobalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

// Legacy Post type for deprecated demo code
type Post = {
  id: string;
  title: string;
  content: string;
} | null;

export default function Post() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { data } = useQuery(trpc.post.byId.queryOptions({ id })) as { data: Post };

  if (!data) return null;

  return (
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: data.title }} />
      <View className="h-full w-full p-4">
        <Text className="text-primary py-2 text-3xl font-bold">
          {data.title}
        </Text>
        <Text className="text-foreground py-4">{data.content}</Text>
      </View>
    </SafeAreaView>
  );
}
