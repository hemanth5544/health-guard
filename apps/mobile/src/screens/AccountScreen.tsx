import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { me, logout } from "../services/authService";
import { useAuthStore } from "../state/authStore";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Role } from "@healthguard/shared-types";
import { theme } from "../theme";

function ProgressRow({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const ratio = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <View style={styles.progressRow}>
      <Text style={styles.muted}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
      </View>
      <Text style={styles.value}>{Math.round(value)} / {max}</Text>
    </View>
  );
}

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
  const trustScore = (user as any)?.trustScore ?? 78;
  const securityScore = (user as any)?.securityScore ?? 86;

  return (
    <View style={styles.root}>
      <View style={styles.header} />
      <View style={styles.body}>
      <Card
        title={`Hi, ${user?.email ? user.email.split("@")[0] : "User"}`}
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

        <ProgressRow label="Account trust" value={trustScore} />
        <ProgressRow label="Security posture" value={securityScore} />
      </Card>

      <Card title="Session">
        <Text style={[styles.label, { marginBottom: 4 }]}>Session Status</Text>
        <Text style={styles.value}>
          {q.isLoading ? "Loading..." : q.isError ? "Invalidated" : "Active"}
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
    backgroundColor: theme.colors.bg
  },
  header: {
    height: 36,
    backgroundColor: theme.colors.bgElevated
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16
  },
  label: {
    color: theme.colors.textSecondary,
    marginBottom: 4
  },
  progressRow: {
    marginTop: 10,
    gap: 6
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.bgElevated,
    overflow: "hidden",
    marginVertical: 4
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.accent
  },
  muted: {
    color: theme.colors.textSecondary
  },
  value: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    marginBottom: 12
  },
  help: {
    color: theme.colors.textMuted,
    marginTop: 8,
    fontSize: 11
  },
  buttonRow: {
    marginTop: 12
  }
});

