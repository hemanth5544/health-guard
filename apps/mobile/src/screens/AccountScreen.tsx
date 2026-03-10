import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { me, logout } from "../services/authService";
import { useAuthStore } from "../state/authStore";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Role } from "@healthguard/shared-types";

export function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
    retry: false
  });

  const mut = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => clear(),
    onError: () => clear()
  });

  const roleColor =
    user?.role === Role.DOCTOR ? "red" : user?.role === Role.TECHNICIAN ? "yellow" : "green";

  return (
    <View style={styles.root}>
      <View style={styles.header} />
      <View style={styles.body}>
      <Card
        title="Account"
        right={user?.role ? <Badge label={user.role} color={roleColor as any} /> : null}
      >
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? "-"}</Text>

        {user?.role === Role.PATIENT && (
          <>
            <Text style={styles.label}>Sensitive Information</Text>
            <Text style={styles.value}>
              Aadhaar: {user?.aadhaarLast4 ? `XXXX-XXXX-${user.aadhaarLast4}` : "Not provided"}
            </Text>
          </>
        )}
      </Card>

      <Card title="Session">
        <Text style={[styles.label, { marginBottom: 4 }]}>Session Status</Text>
        <Text style={styles.value}>
          {q.isLoading ? "Loading..." : q.isError ? "Invalidated ❌" : "Active ✅"}
        </Text>
        <Text style={styles.help}>
          DP.IAM.SESSION.003: server-side invalidation is enforced on every request.
        </Text>
      </Card>

      <View style={styles.buttonRow}>
        <Button
          label="Logout (Invalidate Session)"
          variant="danger"
          onPress={() => mut.mutate()}
          loading={mut.isPending}
        />
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617"
  },
  header: {
    height: 36,
    backgroundColor: "#022c22"
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16
  },
  label: {
    color: "#CBD5F5".replace("F5", "F5"), // soft slate
    marginBottom: 4
  },
  value: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 12
  },
  help: {
    color: "#94A3B8",
    marginTop: 8,
    fontSize: 11
  },
  buttonRow: {
    marginTop: 12
  }
});

