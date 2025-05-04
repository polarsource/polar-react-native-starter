import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import * as Linking from "expo-linking";
import { fetch as expoFetch } from "expo/fetch";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";

export default function HomeScreen() {
  const listRef = useRef<FlatList>(null);
  const isDark = useColorScheme() === "dark";

  const currentUrl = Linking.useURL();

  const { messages, handleInputChange, input, handleSubmit, setMessages } =
    useChat({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: process.env.EXPO_PUBLIC_API_BASE_URL + "/prompt",
      onError: (error) => {
        setMessages((messages) => [
          ...messages,
          {
            id: Math.random().toString(),
            role: "assistant",
            content: "You have insufficient credits.",
          },
        ]);
      },
      headers: {
        "X-Polar-Customer-Id": "09b8b19b-ff4a-4b3a-b12d-78ab168bf7bb",
      },
    });

  useEffect(() => {
    if (currentUrl?.includes("?checkout_redirect")) {
      setMessages((messages) => [
        ...messages,
        {
          id: Math.random().toString(),
          role: "assistant",
          content:
            "Thanks for your purchase! 10,000 credits have been added to your account.",
        },
      ]);
    }
  }, [currentUrl, setMessages]);

  const renderMessage = ({ item }: { item: (typeof messages)[number] }) => (
    <ThemedView
      style={[
        styles.messageContainer,
        item.role === "user" ? styles.userMessage : styles.botMessage,
        item.role === "user" && {
          backgroundColor: isDark ? "#222" : "#F0F0F0",
        },
      ]}
    >
      <ThemedText>{item.content}</ThemedText>
      {item.content.includes("insufficient credits") && (
        <ThemedText
          style={styles.link}
          onPress={() => {
            const polarCustomerId = "09b8b19b-ff4a-4b3a-b12d-78ab168bf7bb";
            const polarCreditsProductId =
              "6870a5f6-1ff8-4907-8fe4-52c5c492f65b";

            const url = new URL(
              process.env.EXPO_PUBLIC_API_BASE_URL + "/checkout"
            );

            url.searchParams.set("products", polarCreditsProductId);
            url.searchParams.set("customerId", polarCustomerId);

            Linking.openURL(url.toString());
          }}
        >
          Please top up your account to continue.
        </ThemedText>
      )}
    </ThemedView>
  );

  useEffect(() => {
    listRef.current?.scrollToEnd();
  }, [messages]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoid}
    >
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.container}>
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.listContainer}
            contentInset={{ bottom: 12 }}
          />

          <ThemedView
            style={StyleSheet.flatten([
              styles.inputContainer,
              { backgroundColor: isDark ? "#222" : "#F0F0F0" },
            ])}
          >
            <TextInput
              style={StyleSheet.flatten([
                styles.input,
                { color: isDark ? "#fff" : "#000" },
              ])}
              value={input}
              onChange={(e) =>
                handleInputChange({
                  ...e,
                  target: {
                    ...e.target,
                    value: e.nativeEvent.text,
                  },
                } as unknown as React.ChangeEvent<HTMLInputElement>)
              }
              onSubmitEditing={(e) => {
                handleSubmit(e);
                e.preventDefault();
              }}
              placeholder="Ask anything..."
              placeholderTextColor={isDark ? "#666" : "#aaa"}
              autoFocus
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.buttonText}>↑</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    padding: 12,
  },
  container: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    padding: 12,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 100,
    maxWidth: "80%",
    marginVertical: 8,
    flexDirection: "column",
    gap: 8,
  },
  botMessage: {
    alignSelf: "flex-start",
  },
  userMessage: {
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    flexDirection: "row",
    flexGrow: 1,
    height: 30,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    width: 30,
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    alignSelf: "flex-end",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "medium",
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  link: {
    color: "#007AFF",
  },
});
