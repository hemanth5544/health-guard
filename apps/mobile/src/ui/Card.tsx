import React from "react";
import { View, Text, StyleSheet } from "react-native";

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
    backgroundColor: "rgba(15, 23, 42, 0.72)", // slate-900-ish
    borderColor: "rgba(51, 65, 85, 0.6)", // slate-700-ish
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  }
});

