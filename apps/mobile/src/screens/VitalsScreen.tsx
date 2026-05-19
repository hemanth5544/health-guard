import React, { useMemo, useState } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getVitals, updateDiagnosis, updateVitals } from "../services/patientService";
import { useAuthStore } from "../state/authStore";
import { Role, type PatientRecord } from "@healthguard/shared-types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { theme } from "../theme";

function fmt(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

export function VitalsScreen() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const q = useQuery({
    queryKey: ["vitals"],
    queryFn: () => getVitals(),
    retry: false
  });

  const record = (q.data?.data ?? null) as PatientRecord | null;

  const [editHeartRate, setEditHeartRate] = useState("");
  const [editBP, setEditBP] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const mVitals = useMutation({
    mutationFn: () =>
      updateVitals(
        {
          heartRate: editHeartRate ? Number(editHeartRate) : undefined,
          bloodPressure: editBP || undefined
        } as any
      ),
    onSuccess: () => q.refetch()
  });

  const mDx = useMutation({
    mutationFn: () => updateDiagnosis({ diagnosis }),
    onSuccess: () => q.refetch()
  });

  const cards = useMemo(
    () => [
      { k: "Blood Pressure", v: fmt(record?.bloodPressure) },
      { k: "Heart Rate", v: fmt(record?.heartRate) },
      { k: "O2 Level", v: fmt(record?.oxygenLevel) },
      { k: "Temperature", v: fmt(record?.temperature) },
      { k: "Weight", v: fmt(record?.weight) },
      { k: "Blood Group", v: fmt(record?.bloodGroup) }
    ],
    [record]
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card title="Vitals Overview">
        {q.isLoading ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : q.isError ? (
          <Text style={styles.error}>Failed to load vitals</Text>
        ) : (
          <View style={styles.list}>
            {cards.map((c) => (
              <View key={c.k} style={styles.row}>
                <Text style={styles.label}>{c.k}</Text>
                <Text style={styles.value}>{c.v}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {role === Role.TECHNICIAN && (
        <Card title="Technician Updates">
          <Input label="Blood Pressure" value={editBP} onChangeText={setEditBP} placeholder="120/80" />
          <Input label="Heart Rate" value={editHeartRate} onChangeText={setEditHeartRate} keyboardType="numeric" />
          <Button label="Save Vitals" onPress={() => mVitals.mutate()} loading={mVitals.isPending} />
        </Card>
      )}

      {role === Role.DOCTOR && (
        <Card title="Doctor Diagnosis">
          <Text style={[styles.label, { marginBottom: 6 }]}>Current</Text>
          <Text style={styles.value}>{record?.diagnosis ?? "-"}</Text>
          <Input label="New diagnosis" value={diagnosis} onChangeText={setDiagnosis} placeholder="Enter notes" />
          <Button label="Save Diagnosis" onPress={() => mDx.mutate()} loading={mDx.isPending} />
        </Card>
      )}

      {role === Role.PATIENT && (
        <Card title="Read-only" >
          <Text style={styles.muted}>
            Patients can view their own vitals but cannot modify them.
          </Text>
        </Card>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16
  },
  list: {
    gap: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: theme.colors.textSecondary
  },
  value: {
    color: theme.colors.textPrimary,
    fontWeight: "700"
  },
  muted: {
    color: theme.colors.textSecondary
  },
  error: {
    color: theme.colors.danger,
    fontWeight: "600"
  }
});

