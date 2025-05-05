# Polar React Native Starter

## Setup a simple backend

```typescript
import dotenv from "dotenv";
dotenv.config();

import { Hono } from "hono";
import { Checkout } from "@polar-sh/hono";
import { streamText } from "ai";
import { Ingestion } from "@polar-sh/ingestion";
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM";
import { openai } from "@ai-sdk/openai";
import { serve } from "@hono/node-server";
import { hasSufficientCredits } from "./middlewares.js";
import { polarConfig } from "./polar.js";

const app = new Hono();

/// --- Checkout --- ///

app.get(
  "/checkout",
  Checkout({
    ...polarConfig,
    successUrl: process.env.POLAR_SUCCESS_URL,
  })
);

/// --- LLM --- ///

const llmIngestion = Ingestion(polarConfig)
  .strategy(new LLMStrategy(openai("gpt-4o")))
  .ingest("openai-usage");

app.post("/prompt", hasSufficientCredits, async (c) => {
  // You should obviously get this from an auth middleware or similar
  // but for this example we'll just use a fixed customer id
  const customerId = "09b8b19b-ff4a-4b3a-b12d-78ab168bf7bb";

  const { messages } = await c.req.json();

  const result = await streamText({
    model: llmIngestion.client({
      customerId,
    }),
    system: "You are a helpful assistant.",
    messages,
  });

  return result.toDataStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
});

app.get("/checkout_redirect", (c) => {
  // Redirect to the app
  return c.redirect("exp://172.22.79.116:8081?checkout_redirect");
});

serve({
  port: 8787,
  fetch: app.fetch,
});
```

### Add a credits check

In order to make sure that users have sufficient credits, we can implement a simple middleware.

```typescript
import { createMiddleware } from "hono/factory";
import { polar } from "./polar.js";

// You should obviously get this from an auth middleware or similar
// but for this example we'll just use a fixed customer id
const customerId = "09b8b19b-ff4a-4b3a-b12d-78ab168bf7bb";

export const hasSufficientCredits = createMiddleware(async (c, next) => {
  const meterId = process.env.POLAR_USAGE_METER_ID ?? "";

  const customerMeter = await polar.customerMeters.list({
    customerId,
    meterId,
  });

  const hasCredits = customerMeter.result.items.some(
    (customerMeter) => customerMeter.balance > 0
  );

  if (!hasCredits) {
    return c.json({
      error: "Insufficient credits",
      status: 400,
    });
  }

  await next();
});
```

## Register App Links

### Apple iOS

Add a file to your domain at .well-known/apple-app-site-association to define the URLs your app handles. Prepend your App ID with your Team ID, which you can find on the Membership page of the Apple Developer Portal.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": [
          "A28BC3DEF9.com.example.MyApp1",
          "A28BC3DEF9.com.example.MyApp1-Debug"
        ],
        "components": [
          {
            "/": "/checkout_redirect*",
            "comment": "Matches any URL whose path starts with /checkout_redirect"
          }
        ]
      }
    ]
  }
}
```

### Android

You can learn more about adding App Links to your Expo Project [here](https://docs.expo.dev/linking/android-app-links/).

## Implement the flow in React Native

```tsx
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
    });

  useEffect(() => {
    if (currentUrl?.includes("?checkout_redirect")) {
      setMessages((messages) => [
        ...messages,
        {
          id: Math.random().toString(),
          role: "assistant",
          content:
            "Thanks for your purchase! 10,000 credits has been added to your account.",
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
            // We're using a fixed Customer ID in the case of this demo
            const customerId = "09b8b19b-ff4a-4b3a-b12d-78ab168bf7bb";
            const polarCreditsProductId =
              "6870a5f6-1ff8-4907-8fe4-52c5c492f65b";

            const url = new URL(
              process.env.EXPO_PUBLIC_API_BASE_URL + "/checkout"
            );

            url.searchParams.set("products", polarCreditsProductId);
            url.searchParams.set("customerId", customerId);
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
              <ThemedText
                style={styles.buttonText}
                lightColor="#fff"
                darkColor="#fff"
              >
                ↑
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
```
