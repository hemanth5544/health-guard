import React from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { theme } from "../theme";

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
        <ActivityIndicator color={variant === "secondary" ? theme.colors.textPrimary : "#020617"} />
      ) : (
        <Text style={[styles.text, textColor]}>{props.label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.shadow.glow.shadowColor,
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  primary: { backgroundColor: theme.colors.accent },
  secondary: { backgroundColor: theme.colors.bgElevated, borderWidth: 1, borderColor: theme.colors.border },
  danger: { backgroundColor: theme.colors.danger },
  disabled: { opacity: 0.5 },
  text: { fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  textOnLight: { color: "#020617" },
  textOnDark: { color: theme.colors.textPrimary }
});


