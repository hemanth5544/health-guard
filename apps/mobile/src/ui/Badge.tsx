import React from "react";
import { Text, View, StyleSheet } from "react-native";

export function Badge(props: { label: string; color?: "green" | "yellow" | "red" | "blue" | "gray" }) {
  const backgroundColor =
    props.color === "green"
      ? "#059669"
      : props.color === "yellow"
        ? "#F59E0B"
        : props.color === "red"
          ? "#E11D48"
          : props.color === "blue"
            ? "#0284C7"
            : "#475569";
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
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  }
});

