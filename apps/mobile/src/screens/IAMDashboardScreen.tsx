import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { evaluate, getAuditLogs, getIntrusionAttempts, simulateAttacks } from "../services/iamService";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import type { AttackReport, AuditLog, IAMControlResult, IntrusionAttempt, Severity } from "@healthguard/shared-types";

function scoreColor(score: number) {
  if (score >= 80) return "green";
  if (score >= 65) return "yellow";
  return "red";
}

function sevColor(sev: Severity) {
  if (sev === "CRITICAL") return "red";
  if (sev === "WARNING") return "yellow";
  return "blue";
}

export function IAMDashboardScreen() {
  const [attackModal, setAttackModal] = useState<AttackReport | null>(null);

  const qEval = useQuery({
    queryKey: ["iam", "evaluate"],
    queryFn: () => evaluate(),
    retry: false
  });

  const qAudit = useQuery({
    queryKey: ["iam", "audit"],
    queryFn: () => getAuditLogs(),
    retry: false
  });

  const qIntrusion = useQuery({
    queryKey: ["iam", "intrusion"],
    queryFn: () => getIntrusionAttempts(),
    retry: false
  });

  const mEval = useMutation({
    mutationFn: () => evaluate(),
    onSuccess: () => {
      qEval.refetch();
      qAudit.refetch();
    }
  });

  const mAttacks = useMutation({
    mutationFn: () => simulateAttacks(),
    onSuccess: (resp) => setAttackModal(resp.data)
  });

  const data = (qEval.data?.data ?? null) as IAMControlResult | null;

  const compliance = data?.complianceScore ?? 0;
  const risk = data?.riskScore ?? 0;

  const objectives = useMemo(
    () => [
      "Session token theft and reuse prevention",
      "Cross-interface session hijacking prevention",
      "Session replay attack prevention",
      "Concurrent session abuse prevention"
    ],
    []
  );

  const auditLogs = (qAudit.data?.data ?? []) as AuditLog[];
  const intrusion = (qIntrusion.data?.data ?? []) as IntrusionAttempt[];

  const totalIntrusions = intrusion.length;
  const blockedIntrusions = intrusion.filter((a) => a.blocked).length;
  const successfulIntrusions = totalIntrusions - blockedIntrusions;

  const privEscAttempts = intrusion.filter((a) =>
    a.attemptType === "PRIV_ESCALATION" || a.attemptType === "HORIZONTAL_ESCALATION"
  ).length;

  return (
    <View style={styles.root}>
      <View style={styles.header} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Card title="DP.IAM.SESSION.003 — Control Overview" right={<Badge label="IMPLEMENTED" color="green" />}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.muted}>Compliance</Text>
            <Text style={styles.bigNumber}>{compliance}%</Text>
            <View style={{ marginTop: 8 }}>
              <Badge label={scoreColor(compliance).toUpperCase()} color={scoreColor(compliance) as any} />
            </View>
          </View>
          <View>
            <Text style={styles.muted}>Risk score</Text>
            <Text style={styles.bigNumber}>{risk}</Text>
            <Text style={styles.smallMuted}>Bayesian weighted</Text>
          </View>
        </View>
      </Card>

      <Card title="Top threats (0–20)">
        {!data ? (
          <Text style={styles.muted}>Run evaluation to populate threats.</Text>
        ) : (
          <View style={styles.list}>
            {data.topThreats.map((t) => (
              <View key={t.name} style={styles.rowBetween}>
                <Text style={styles.text}>{t.name}</Text>
                <Text style={styles.value}>{t.score}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card title="Intrusion attempts">
        {qIntrusion.isLoading ? (
          <Text style={styles.muted}>Loading intrusion data…</Text>
        ) : intrusion.length === 0 ? (
          <Text style={styles.muted}>No intrusion attempts recorded yet.</Text>
        ) : (
          <>
            <View style={[styles.rowBetween, { marginBottom: 8 }]}>
              <Text style={styles.muted}>Total attempts</Text>
              <Text style={styles.value}>{totalIntrusions}</Text>
            </View>
            <View style={[styles.rowBetween, { marginBottom: 8 }]}>
              <Text style={styles.muted}>Blocked</Text>
              <Text style={[styles.value, { color: "#22C55E" }]}>{blockedIntrusions}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Succeeded</Text>
              <Text style={[styles.value, { color: successfulIntrusions > 0 ? "#FB7185" : "#22C55E" }]}>
                {successfulIntrusions}
              </Text>
            </View>
            <View style={[styles.list, { marginTop: 10 }]}>
              {Object.entries(
                intrusion.reduce<Record<string, number>>((acc, a) => {
                  acc[a.attemptType] = (acc[a.attemptType] ?? 0) + 1;
                  return acc;
                }, {})
              ).map(([type, count]) => (
                <View key={type} style={styles.rowBetween}>
                  <Text style={styles.text}>{type}</Text>
                  <Text style={styles.muted}>{count}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      <Card title="Privilege escalation & RBAC">
        <View style={styles.list}>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Privilege escalation attempts</Text>
            <Badge
              label={`${privEscAttempts}`}
              color={privEscAttempts > 0 ? "red" : "green"}
            />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>RBAC bypass attempts (denied)</Text>
            <Badge
              label={`${data?.rbacBypassAttempts ?? 0}`}
              color={(data?.rbacBypassAttempts ?? 0) > 0 ? "yellow" : "green"}
            />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Session invalidation (logout)</Text>
            <Badge
              label={data?.sessionInvalidationCompliance ? "ENFORCED" : "AT RISK"}
              color={data?.sessionInvalidationCompliance ? "green" : "red"}
            />
          </View>
        </View>
        <Text style={[styles.smallMuted, { marginTop: 10 }]}>
          Techniques monitored: JWT tampering, role/parameter injection, horizontal (other patient IDs) and vertical
          (TECHNICIAN → DOCTOR APIs) privilege escalation, token replay after logout, and invalidated session reuse.
        </Text>
      </Card>

      <Card title="Control details">
        <View style={styles.list}>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Control ID</Text>
            <Text style={styles.value}>{data?.controlId ?? "DP-SESSION-001"}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Control Name</Text>
            <Text style={[styles.value, styles.alignRight]}>
              {data?.controlName ?? "Secure Session Management for IoT Operations"}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Frameworks</Text>
            <Text style={[styles.value, styles.alignRight]}>
              DPDP, ISO 27001 (A.9.4.2), SOC II (CC6.1)
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Priority</Text>
            <Badge label="HIGH" color="red" />
          </View>
        </View>
      </Card>

      <Card title="Control objective checklist">
        <View style={styles.list}>
          {objectives.map((o) => (
            <View key={o} style={styles.rowBetween}>
              <Text style={[styles.text, { flex: 1, marginRight: 12 }]}>{o}</Text>
              <Badge label="✓" color="green" />
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <Button label="Run Evaluation" onPress={() => mEval.mutate()} loading={mEval.isPending} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Simulate Attacks"
            variant="secondary"
            onPress={() => mAttacks.mutate()}
            loading={mAttacks.isPending}
          />
        </View>
      </View>
      <Button label="Refresh" variant="secondary" onPress={() => { qEval.refetch(); qAudit.refetch(); }} />

      <Card title="Audit logs (last 20)">
        {qAudit.isError ? (
          <Text style={styles.muted}>
            Audit logs are restricted to DOCTOR role.
          </Text>
        ) : auditLogs.length === 0 ? (
          <Text style={styles.muted}>No logs yet.</Text>
        ) : (
          <View style={styles.list}>
            {auditLogs.map((l) => (
              <View key={l.id} style={styles.rowBetween}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.value}>{l.action}</Text>
                  <Text style={styles.smallMuted}>{new Date(l.timestamp).toLocaleString()}</Text>
                </View>
                <Badge label={l.severity} color={sevColor(l.severity) as any} />
              </View>
            ))}
          </View>
        )}
      </Card>

      <Modal visible={!!attackModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Attack simulation report</Text>
            {attackModal && (
              <>
                <Text style={styles.muted}>
                  Blocked: <Text style={styles.blocked}>{attackModal.blocked}</Text>{" "}
                  Succeeded: <Text style={styles.succeeded}>{attackModal.succeeded}</Text>
                </Text>
                <View style={[styles.list, { marginTop: 12, marginBottom: 16 }]}>
                  {attackModal.results.map((r) => (
                    <View key={r.name} style={styles.rowBetween}>
                      <Text style={[styles.text, { flex: 1, marginRight: 12 }]}>{r.name}</Text>
                      <Badge label={r.blocked ? "BLOCKED ✅" : "SUCCEEDED ❌"} color={r.blocked ? "green" : "red"} />
                    </View>
                  ))}
                </View>
              </>
            )}
            <Pressable onPress={() => setAttackModal(null)} style={{ marginTop: 4 }}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  header: { height: 40, backgroundColor: "#450a0a" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  list: { gap: 8 },
  muted: { color: "#9CA3AF" },
  smallMuted: { color: "#9CA3AF", fontSize: 11 },
  text: { color: "#E5E7EB" },
  value: { color: "#FFFFFF", fontWeight: "700" },
  bigNumber: { color: "#FFFFFF", fontSize: 32, fontWeight: "900" },
  alignRight: { textAlign: "right", flex: 1, marginLeft: 16 },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: "#020617",
    borderRadius: 18,
    padding: 16,
    borderColor: "#1F2937",
    borderWidth: 1,
    width: "100%"
  },
  modalTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", marginBottom: 8 },
  blocked: { color: "#22C55E", fontWeight: "700" },
  succeeded: { color: "#FB7185", fontWeight: "700" },
  link: { color: "#F59E0B", fontWeight: "700", textAlign: "center" }
});

