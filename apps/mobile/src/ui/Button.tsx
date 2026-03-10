import React from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";

export function Button(props: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
}) {
  const variant = props.variant ?? "primary";
  const bg =
    variant === "secondary" ? styles.secondary : variant === "danger" ? styles.danger : styles.primary;
  const textColor = variant === "secondary" ? styles.textOnDark : styles.textOnLight;
  const pressableStyle = [styles.base, bg, (props.disabled || props.loading) ? styles.disabled : null];

  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled || props.loading}
      style={pressableStyle}
    >
      {props.loading ? (
        <ActivityIndicator color={variant === "secondary" ? "#E2E8F0" : "#0B1220"} />
      ) : (
        <Text style={[styles.text, textColor]}>{props.label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  primary: { backgroundColor: "#F59E0B" },
  secondary: { backgroundColor: "#1F2937" },
  danger: { backgroundColor: "#E11D48" },
  disabled: { opacity: 0.55 },
  text: { fontSize: 15, fontWeight: "800" },
  textOnLight: { color: "#0B1220" },
  textOnDark: { color: "#E2E8F0" }
});

