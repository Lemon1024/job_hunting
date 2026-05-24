import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}

export default function EmptyState({ icon = "document-text-outline", message }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.muted} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl * 2 },
  text: { color: colors.muted, fontSize: 15, marginTop: spacing.md, textAlign: "center" },
});
