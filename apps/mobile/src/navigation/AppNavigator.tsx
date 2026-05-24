import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import AddApplicationScreen from "../screens/AddApplicationScreen";
import ApplicationDetailScreen from "../screens/ApplicationDetailScreen";
import CalendarScreen from "../screens/CalendarScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const DashStack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="DashboardMain" component={DashboardScreen} />
      <DashStack.Screen name="AddApplication" component={AddApplicationScreen} options={{ animation: "slide_from_bottom" }} />
      <DashStack.Screen name="ApplicationDetail" component={ApplicationDetailScreen} options={{ animation: "slide_from_right" }} />
    </DashStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            DashboardTab: focused ? "send" : "send-outline",
            CalendarTab: focused ? "calendar" : "calendar-outline",
            ProfileTab: focused ? "person" : "person-outline",
          };
          return <Ionicons name={icons[route.name] ?? "ellipse"} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: fonts.semibold },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ tabBarLabel: "投递" }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ tabBarLabel: "日历" }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: "我的" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
