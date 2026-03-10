import React, { useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { login } from "../services/authService";
import { useAuthStore } from "../state/authStore";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function LoginScreen({ navigation }: any) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("patient@test.com");
  const [password, setPassword] = useState("Patient@123");
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: (resp) => {
      setError(null);
      setAuth({ token: resp.data.token, user: resp.data.user });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? "Login failed")
  });

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>HealthGuard</Text>
      <Text style={styles.sub}>Secure healthcare IAM demo</Text>

      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button label="Login" onPress={() => mut.mutate()} loading={mut.isPending} />

      <Pressable onPress={() => navigation.navigate("Register")} style={styles.linkWrap}>
        <Text style={styles.link}>Create an account</Text>
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
  h1: { color: "#FFFFFF", fontSize: 32, fontWeight: "900", marginBottom: 6 },
  sub: { color: "#94A3B8", marginBottom: 22 },
  error: { color: "#FB7185", marginBottom: 12, fontWeight: "600" },
  linkWrap: { marginTop: 16 },
  link: { color: "#F59E0B", textAlign: "center", fontWeight: "700" }
});

