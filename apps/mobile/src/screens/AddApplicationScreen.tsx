import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationInput,
  createApplication,
  createEvent,
  getStatus,
  todayISO,
  updateApplication,
} from "@job-tracker/core";
import { supabase } from "../supabaseClient";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: { params?: { application?: Application; mode?: "edit" } };
};

const PRIORITIES = ["high", "medium", "low"] as const;
const priorityLabels: Record<string, string> = { high: "高", medium: "中", low: "低" };

const CITIES = ["北京","上海","深圳","杭州","广州","成都","南京","武汉","苏州","西安","其他","远程"];
const CHANNELS = ["官网投递","Boss 直聘","猎聘","脉脉","内推","实习僧","牛客网","其他"];

export default function AddApplicationScreen({ navigation, route }: Props) {
  const existing = route.params?.application;
  const isEdit = route.params?.mode === "edit" || existing != null;

  const [company, setCompany] = useState(existing?.company_name ?? "");
  const [position, setPosition] = useState(existing?.position_name ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [channel, setChannel] = useState(existing?.channel ?? "");
  const [status, setStatus] = useState(existing?.status ?? "applied");
  const [appliedDate, setAppliedDate] = useState<Date>(
    existing?.applied_date ? new Date(existing.applied_date) : new Date(),
  );
  const [priority, setPriority] = useState<string>(existing?.priority ?? "medium");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!company.trim() || !position.trim()) {
      Alert.alert("请填写", "公司和岗位为必填项");
      return;
    }
    setSaving(true);
    try {
      const payload: ApplicationInput = {
        company_name: company.trim(),
        position_name: position.trim(),
        city: city || null,
        channel: channel || null,
        status: status as ApplicationInput["status"],
        priority: priority as ApplicationInput["priority"],
        applied_date: status === "todo" ? null : appliedDate.toISOString().split("T")[0],
        next_action_date: null,
        job_url: "",
        salary_range: "",
        resume_version: "",
        contact_name: "",
        contact_info: "",
        notes: notes.trim() || null,
      };

      if (isEdit && existing) {
        await updateApplication(supabase as never, existing.id, payload);
      } else {
        const created = await createApplication(supabase as never, payload);
        await createEvent(supabase as never, {
          application_id: created.id,
          type: "create",
          title: `创建投递记录，状态为「${getStatus(created.status).label}」`,
          description: null,
          event_date: payload.applied_date ?? todayISO(),
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("保存失败", e instanceof Error ? e.message : "未知错误");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "编辑投递" : "新增投递"}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? "保存中..." : "保存"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body}>
          {/* Company */}
          <Text style={styles.label}>公司</Text>
          <TextInput style={styles.input} value={company} onChangeText={setCompany} placeholder="输入公司名称" placeholderTextColor={colors.muted} />

          {/* Position */}
          <Text style={styles.label}>岗位</Text>
          <TextInput style={styles.input} value={position} onChangeText={setPosition} placeholder="输入岗位名称" placeholderTextColor={colors.muted} />

          {/* City */}
          <Text style={styles.label}>城市</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowCityPicker(true)}>
            <Text style={city ? styles.inputText : styles.inputPlaceholder}>{city || "选择城市"}</Text>
          </TouchableOpacity>

          {/* Channel */}
          <Text style={styles.label}>渠道</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowChannelPicker(true)}>
            <Text style={channel ? styles.inputText : styles.inputPlaceholder}>{channel || "选择渠道"}</Text>
          </TouchableOpacity>

          {/* Status */}
          <Text style={styles.label}>当前状态</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowStatusPicker(true)}>
            <Text style={styles.inputText}>{getStatus(status).label}</Text>
          </TouchableOpacity>

          {/* Applied Date */}
          <Text style={styles.label}>投递日期</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.inputText}>
              {status === "todo" ? "待投递" : appliedDate.toISOString().split("T")[0]}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={appliedDate}
              mode="date"
              display="default"
              onChange={(_e, d) => {
                setShowDatePicker(false);
                if (d) setAppliedDate(d);
              }}
            />
          )}

          {/* Priority */}
          <Text style={styles.label}>优先级</Text>
          <View style={styles.segRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.segBtn, priority === p && styles.segBtnActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.segText, priority === p && styles.segTextActive]}>{priorityLabels[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.label}>备注</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={(v) => { if (v.length <= 200) setNotes(v); }}
            placeholder="备注信息..."
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{notes.length}/200</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* City picker modal */}
      <PickerModal visible={showCityPicker} items={CITIES} selected={city} onSelect={(v) => { setCity(v); setShowCityPicker(false); }} onClose={() => setShowCityPicker(false)} />
      <PickerModal visible={showChannelPicker} items={CHANNELS} selected={channel} onSelect={(v) => { setChannel(v); setShowChannelPicker(false); }} onClose={() => setShowChannelPicker(false)} />
      <PickerModal visible={showStatusPicker} items={APPLICATION_STATUSES.map((s) => s.id)} labels={APPLICATION_STATUSES.map((s) => s.label)} selected={status} onSelect={(v) => { setStatus(v); setShowStatusPicker(false); }} onClose={() => setShowStatusPicker(false)} />
    </SafeAreaView>
  );
}

function PickerModal({ visible, items, labels, selected, onSelect, onClose }: {
  visible: boolean;
  items: string[];
  labels?: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={pickerStyles.sheet}>
          <Text style={pickerStyles.title}>请选择</Text>
          {items.map((item, i) => (
            <TouchableOpacity
              key={item}
              style={[pickerStyles.item, selected === item && pickerStyles.itemActive]}
              onPress={() => onSelect(item)}
            >
              <Text style={[pickerStyles.itemText, selected === item && pickerStyles.itemTextActive]}>
                {labels ? labels[i] : item}
              </Text>
              {selected === item && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
  title: { fontSize: 16, fontWeight: fonts.bold, color: colors.text, marginBottom: spacing.md, textAlign: "center" },
  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md },
  itemActive: { backgroundColor: colors.primaryLight },
  itemText: { fontSize: 15, color: colors.text },
  itemTextActive: { color: colors.primaryText, fontWeight: fonts.bold },
});

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: fonts.bold, color: colors.text },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveText: { color: colors.headerText, fontWeight: fonts.bold, fontSize: 14 },
  body: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 2 },
  label: { fontSize: 14, fontWeight: fonts.bold, color: colors.text, marginTop: spacing.sm },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
    justifyContent: "center",
  },
  inputText: { fontSize: 15, color: colors.text },
  inputPlaceholder: { fontSize: 15, color: colors.muted },
  notesInput: { minHeight: 80, paddingTop: spacing.md },
  charCount: { fontSize: 11, color: colors.muted, textAlign: "right", marginTop: -spacing.xs },
  segRow: { flexDirection: "row", gap: spacing.sm },
  segBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.tabInactive,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnActive: { backgroundColor: colors.primaryLight },
  segText: { fontSize: 14, color: colors.muted, fontWeight: fonts.semibold },
  segTextActive: { color: colors.primaryText, fontWeight: fonts.bold },
});
