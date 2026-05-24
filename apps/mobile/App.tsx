import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { supabase } from "./src/supabaseClient";
import AppNavigator from "./src/navigation/AppNavigator";
import type { Session } from "@supabase/supabase-js";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator isLoggedIn={session !== null} />
    </NavigationContainer>
  );
}
