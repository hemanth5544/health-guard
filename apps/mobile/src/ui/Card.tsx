import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export function Card(props: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      {(props.title || props.right) && (
        <View style={styles.headerRow}>
          <Text style={styles.title}>{props.title ?? ""}</Text>
          {props.right}
        </View>
      )}
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgCard,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 16,
    shadowColor: theme.shadow.card.shadowColor,
    shadowOpacity: theme.shadow.card.shadowOpacity,
    shadowRadius: theme.shadow.card.shadowRadius
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3
  }
});


