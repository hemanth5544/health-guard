import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { theme } from "../theme";

type BadgeTone = "green" | "yellow" | "red" | "blue" | "gray";

export function Badge(props: { label: string; color?: BadgeTone }) {
  const tone: BadgeTone = props.color ?? "gray";

  const backgroundColor =
    tone === "green"
      ? theme.colors.success
      : tone === "yellow"
        ? theme.colors.warning
        : tone === "red"
          ? theme.colors.danger
          : tone === "blue"
            ? theme.colors.accent
            : theme.colors.textMuted;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.text}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4
  }
});


