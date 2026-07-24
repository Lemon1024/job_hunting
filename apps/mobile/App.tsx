import { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "./src/supabaseClient";
import AppNavigator from "./src/navigation/AppNavigator";
import type { Session } from "@supabase/supabase-js";
import { colors, ThemeProvider, useAppTheme } from "./src/theme";
import { getProfile } from "@job-tracker/core";

function ProfileThemeSync({ userId }: { userId?: string }) {
  const { setPreference } = useAppTheme();
  useEffect(() => {
    if (!userId) return;
    getProfile(supabase as never)
      .then((profile) => setPreference(profile.theme_preference))
      .catch(() => undefined);
  }, [setPreference, userId]);
  return null;
}

function ThemedApp({ session }: { session: Session | null }) {
  const { resolvedTheme } = useAppTheme();
  const baseTheme = resolvedTheme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.bg as string,
      card: colors.surface as string,
      text: colors.text as string,
      border: colors.border as string,
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator isLoggedIn={session !== null} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider>
      <ProfileThemeSync userId={session?.user.id} />
      <ThemedApp session={session} />
    </ThemeProvider>
  );
}
