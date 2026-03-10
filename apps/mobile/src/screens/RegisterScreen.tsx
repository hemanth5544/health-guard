import React, { useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { register } from "../services/authService";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Role } from "@healthguard/shared-types";

export function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [role, setRole] = useState<Role>(Role.PATIENT);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      register({
        email,
        password,
        role,
        aadhaar: role === Role.PATIENT && aadhaar ? aadhaar : undefined
      }),
    onSuccess: () => {
      setError(null);
      navigation.navigate("Login");
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? "Registration failed")
  });

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Create account</Text>

      <View style={styles.roleRow}>
        {([Role.PATIENT, Role.TECHNICIAN, Role.DOCTOR] as const).map((r) => (
          <Pressable key={r} onPress={() => setRole(r)} style={styles.roleItem}>
            <Badge
              label={r}
              color={role === r ? (r === Role.DOCTOR ? "red" : r === Role.TECHNICIAN ? "yellow" : "green") : "gray"}
            />
          </Pressable>
        ))}
      </View>

      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {role === Role.PATIENT && (
        <Input label="Aadhaar (optional)" value={aadhaar} onChangeText={setAadhaar} keyboardType="numeric" />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Button label="Register" onPress={() => mut.mutate()} loading={mut.isPending} />

      <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
        <Text style={styles.back}>Back to login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    paddingHorizontal: 20,
    paddingTop: 44
  },
  h1: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginBottom: 18 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  roleItem: { marginRight: 8, marginBottom: 8 },
  error: { color: "#FB7185", marginBottom: 12, fontWeight: "600" },
  linkWrap: { marginTop: 16 },
  back: { color: "#CBD5E1", textAlign: "center", fontWeight: "700" }
});

