import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { evaluate, getAuditLogs, getIntrusionAttempts, simulateAttacks } from "../services/iamService";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import type { AttackReport, AuditLog, IAMControlResult, IntrusionAttempt, Severity } from "@healthguard/shared-types";
import { theme } from "../theme";

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

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function BarRow(props: { label: string; value: number; max?: number; suffix?: string }) {
  const max = props.max ?? 100;
  const ratio = clamp01(max === 0 ? 0 : props.value / max);
  return (
    <View style={styles.barRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.muted}>{props.label}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
        </View>
      </View>
      <Text style={styles.barValue}>
        {props.value}
        {props.suffix ?? ""}
      </Text>
    </View>
  );
}

export function IAMDashboardScreen() {
  const [attackModal, setAttackModal] = useState<AttackReport | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const auditPageSize = 6;

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

  const totalAuditPages = Math.max(1, Math.ceil(auditLogs.length / auditPageSize));
  const auditLogsPage = auditLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize);

  useEffect(() => {
    setAuditPage(1);
  }, [auditLogs.length]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>IAM Shield</Text>
        <Text style={styles.headerSubtitle}>Session & intrusion posture at a glance</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Card
        title="DP.IAM.SESSION.003 — Control Overview"
        right={<Badge label="IMPLEMENTED" color="green" />}
      >
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
        <View style={{ marginTop: 16 }}>
          <BarRow label="Compliance" value={compliance} max={100} suffix="%" />
          <BarRow label="Risk score" value={risk} max={100} />
        </View>
      </Card>

      {/* <Card title="Top threats (0–20)">
        {!data ? (
          <Text style={styles.muted}>Run evaluation to populate threats.</Text>
        ) : (
          <View style={styles.list}>
            {data.topThreats.map((t) => {
              const strength = Math.min(100, Math.max(0, (t.score / 20) * 100));
              return (
                <View key={t.name} style={styles.threatRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.text}>{t.name}</Text>
                    <View style={styles.threatBarTrack}>
                      <View style={[styles.threatBarFill, { width: `${strength}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.value}>{t.score}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Card> */}

      <Card title="Intrusion attempts">
        {qIntrusion.isLoading ? (
          <Text style={styles.muted}>Loading intrusion data…</Text>
        ) : intrusion.length === 0 ? (
          <Text style={styles.muted}>No intrusion attempts recorded yet.</Text>
        ) : (
          <>
            <View style={styles.intrusionSummary}>
              <BarRow label="Total attempts" value={totalIntrusions} max={Math.max(totalIntrusions, 1)} />
              <BarRow label="Blocked" value={blockedIntrusions} max={Math.max(totalIntrusions, 1)} />
              <BarRow
                label="Succeeded"
                value={successfulIntrusions}
                max={Math.max(totalIntrusions, 1)}
              />
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
      <Button
        label="Refresh"
        variant="secondary"
        onPress={() => {
          qEval.refetch();
          qAudit.refetch();
        }}
      />

      <Card title={`Audit logs (page ${auditPage}/${totalAuditPages})`}>
        {qAudit.isError ? (
          <Text style={styles.muted}>
            Audit logs are restricted to DOCTOR role.
          </Text>
        ) : auditLogs.length === 0 ? (
          <Text style={styles.muted}>No logs yet.</Text>
        ) : (
          <>
            <Text style={styles.smallMuted}>
              Showing {auditLogsPage.length} of {auditLogs.length} entries.
            </Text>
            <View style={styles.list}>
              {auditLogsPage.map((l) => (
                <View key={l.id} style={styles.rowBetween}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.value}>{l.action}</Text>
                    <Text style={styles.smallMuted}>{new Date(l.timestamp).toLocaleString()}</Text>
                  </View>
                  <Badge label={l.severity} color={sevColor(l.severity) as any} />
                </View>
              ))}
            </View>
            <View style={styles.paginationRow}>
              <Button
                label="← Prev"
                disabled={auditPage <= 1}
                variant="secondary"
                onPress={() => setAuditPage((page) => Math.max(1, page - 1))}
              />
              <Button
                label="Next →"
                disabled={auditPage >= totalAuditPages}
                variant="secondary"
                onPress={() => setAuditPage((page) => Math.min(totalAuditPages, page + 1))}
              />
            </View>
          </>
        )}
      </Card>

      <Modal visible={!!attackModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Attack simulation report</Text>
            {attackModal && (
              <>
                <View style={[styles.list, { marginTop: 12, marginBottom: 16 }]}>
                  {attackModal.results.map((r) => (
                    <View key={r.name} style={styles.rowBetween}>
                      <Text style={[styles.text, { flex: 1, marginRight: 12 }]}>{r.name}</Text>
                      <Badge label={r.blocked ? "BLOCKED" : "BYPASSED"} color={r.blocked ? "green" : "red"} />
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
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  list: { gap: 8 },
  muted: { color: theme.colors.textSecondary },
  smallMuted: { color: theme.colors.textMuted, fontSize: 11 },
  text: { color: theme.colors.textPrimary },
  value: { color: theme.colors.textPrimary, fontWeight: "700" },
  bigNumber: { color: theme.colors.textPrimary, fontSize: 32, fontWeight: "900" },
  alignRight: { textAlign: "right", flex: 1, marginLeft: 16 },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  intrusionSummary: { marginBottom: 8, gap: 6 },
  threatRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  threatBarTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.bgElevated,
    overflow: "hidden",
    marginTop: 4
  },
  threatBarFill: {
    height: "100%",
    backgroundColor: theme.colors.accent,
    borderRadius: 999
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
    width: "100%"
  },
  modalTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "900", marginBottom: 8 },
  blocked: { color: theme.colors.success, fontWeight: "700" },
  succeeded: { color: theme.colors.danger, fontWeight: "700" },
  link: { color: theme.colors.accent, fontWeight: "700", textAlign: "center" },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.6
  },
  headerSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12
  },
  barTrack: {
    marginTop: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.bgElevated,
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.accent
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  barValue: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 12
  }
});

