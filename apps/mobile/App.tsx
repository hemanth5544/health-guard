import "./global.css";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Shield, Activity, User2 } from "lucide-react-native";
import { useAuthStore } from "./src/state/authStore";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { AccountScreen } from "./src/screens/AccountScreen";
import { VitalsScreen } from "./src/screens/VitalsScreen";
import { IAMDashboardScreen } from "./src/screens/IAMDashboardScreen";
import { theme } from "./src/theme";

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const tabLabels = ["ACCOUNT", "VITALS", "IAM DASHBOARD"] as const;

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={stylesTab.root}>
      <View style={stylesTab.pill}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };
            const label = tabLabels[index] ?? route.name.toUpperCase();

            const IconComp =
              route.name === "Account"
                ? User2
                : route.name === "Health & Vitals"
                  ? Activity
                  : Shield;

            return (
              <View key={route.key} style={stylesTab.itemWrap}>
                <View style={[stylesTab.item, isFocused && stylesTab.itemActive]}>
                  <IconComp
                    onPress={onPress}
                    size={18}
                    color={isFocused ? "#020617" : theme.colors.textMuted}
                    style={stylesTab.icon}
                  />
                  <Text
                    onPress={onPress}
                    style={[stylesTab.label, isFocused ? stylesTab.labelActive : stylesTab.labelInactive]}
                  >
                    {label}
                  </Text>
                </View>
              </View>
            );
          })}
      </View>
    </View>
  );
}

function AppTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: 74
        }
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="Account" component={AccountScreen} />
      <Tabs.Screen name="Health & Vitals" component={VitalsScreen} />
      <Tabs.Screen name="IAM Dashboard" component={IAMDashboardScreen} />
    </Tabs.Navigator>
  );
}

function RootNav() {
  const token = useAuthStore((s) => s.token);
  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: theme.colors.bg }
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg }
        }}
      >
        {token ? (
          <Stack.Screen name="App" component={AppTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNav />
    </QueryClientProvider>
  );
}

const stylesTab = StyleSheet.create({
  root: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 10
  },
  pill: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "rgba(15,22,35,0.95)",
    borderRadius: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8
  },
  itemWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  itemActive: {
    backgroundColor: theme.colors.accent
  },
  icon: {
    marginRight: 6
  },
  iconActive: {
    color: "#020617"
  },
  iconInactive: {
    color: theme.colors.textMuted
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.5
  },
  labelActive: {
    color: "#020617",
    fontWeight: "700"
  },
  labelInactive: {
    color: theme.colors.textMuted
  }
});

