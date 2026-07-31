import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable as TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  listApplications,
  todayISO,
  updateApplication,
} from "@job-tracker/core";
import { supabase } from "../supabaseClient";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DashboardStackParamList } from "../navigation/types";
import {
  CHANNEL_OPTIONS,
  CITY_OPTIONS,
  collectResumeVersionOptions,
  getErrorMessage,
  normalizeChannel,
  resolveInitialCity,
} from "../applicationForm";

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, "AddApplication">;
  route: { params?: DashboardStackParamList["AddApplication"] };
};

const PRIORITIES = ["high", "medium", "low"] as const;
const priorityLabels: Record<string, string> = { high: "高", medium: "中", low: "低" };

export default function AddApplicationScreen({ navigation, route }: Props) {
  const existing = route.params?.application;
  const isEdit = route.params?.mode === "edit" || existing != null;

  const [company, setCompany] = useState(existing?.company_name ?? "");
  const [position, setPosition] = useState(existing?.position_name ?? "");
  const [city, setCity] = useState(resolveInitialCity(existing));
  const [channel, setChannel] = useState(normalizeChannel(existing?.channel));
  const [resumeVersion, setResumeVersion] = useState(existing?.resume_version?.trim() ?? "");
  const [resumeVersionOptions, setResumeVersionOptions] = useState<string[]>(() =>
    collectResumeVersionOptions([], existing?.resume_version),
  );
  const [status, setStatus] = useState(existing?.status ?? "applied");
  const [appliedDate, setAppliedDate] = useState<Date>(
    existing?.applied_date ? new Date(existing.applied_date) : new Date(),
  );
  const [priority, setPriority] = useState<string>(existing?.priority ?? "medium");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [showResumeVersionPicker, setShowResumeVersionPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void listApplications(supabase as never)
      .then((applications) => {
        if (!cancelled) {
          const options = collectResumeVersionOptions(applications, existing?.resume_version);
          const initialOptions = collectResumeVersionOptions([], existing?.resume_version);
          if (options.some((option, index) => option !== initialOptions[index])) {
            setResumeVersionOptions(options);
          }
        }
      })
      .catch((error) => console.warn("Failed to load resume versions", error));
    return () => { cancelled = true; };
  }, [existing?.id, existing?.resume_version]);

  async function save() {
    if (savingRef.current) return;
    if (!company.trim() || !position.trim()) {
      Alert.alert("请填写", "公司和岗位为必填项");
      return;
    }
    savingRef.current = true;
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
        next_action_date: existing?.next_action_date ?? null,
        job_url: existing?.job_url ?? null,
        salary_range: existing?.salary_range ?? null,
        resume_version: resumeVersion.trim() || null,
        contact_name: existing?.contact_name ?? null,
        contact_info: existing?.contact_info ?? null,
        notes: notes.trim() || null,
      };

      if (isEdit && existing) {
        await updateApplication(supabase as never, existing.id, payload);
      } else {
        const created = await createApplication(supabase as never, payload);
        void createEvent(supabase as never, {
          application_id: created.id,
          type: "create",
          title: `创建投递记录，状态为「${getStatus(created.status).label}」`,
          description: null,
          event_date: payload.applied_date ?? todayISO(),
        }).catch((error) => console.warn("Failed to create application event", error));
      }
    } catch (e) {
      Alert.alert("保存失败", getErrorMessage(e));
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "编辑投递" : "新增投递"}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="保存投递" style={styles.saveBtn} onPress={save} disabled={saving}>
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="选择城市"
            style={styles.input}
            onPress={() => setShowCityPicker(true)}
          >
            <Text style={city ? styles.inputText : styles.inputPlaceholder}>{city || "选择城市"}</Text>
          </TouchableOpacity>

          {/* Channel */}
          <Text style={styles.label}>渠道</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="选择渠道" style={styles.input} onPress={() => setShowChannelPicker(true)}>
            <Text style={channel ? styles.inputText : styles.inputPlaceholder}>{channel || "选择渠道"}</Text>
          </TouchableOpacity>

          {/* Resume version */}
          <Text style={styles.label}>简历版本</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="选择简历版本"
            style={styles.input}
            onPress={() => setShowResumeVersionPicker(true)}
          >
            <Text style={resumeVersion ? styles.inputText : styles.inputPlaceholder}>{resumeVersion || "未指定"}</Text>
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

      <PickerModal visible={showCityPicker} items={CITY_OPTIONS} selected={city} onSelect={(v) => { setCity(v); setShowCityPicker(false); }} onClose={() => setShowCityPicker(false)} />
      <PickerModal visible={showChannelPicker} items={CHANNEL_OPTIONS} selected={channel} onSelect={(v) => { setChannel(v); setShowChannelPicker(false); }} onClose={() => setShowChannelPicker(false)} />
      <PickerModal visible={showStatusPicker} items={APPLICATION_STATUSES.map((s) => s.id)} labels={APPLICATION_STATUSES.map((s) => s.label)} selected={status} onSelect={(v) => { setStatus(v as ApplicationInput["status"]); setShowStatusPicker(false); }} onClose={() => setShowStatusPicker(false)} />
      <ResumeVersionModal
        visible={showResumeVersionPicker}
        options={resumeVersionOptions}
        selected={resumeVersion}
        onSelect={setResumeVersion}
        onClose={() => setShowResumeVersionPicker(false)}
      />
    </SafeAreaView>
  );
}

function ResumeVersionModal({ visible, options, selected, onSelect, onClose }: {
  visible: boolean;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (visible) setDraft("");
  }, [visible]);

  function select(value: string) {
    onSelect(value);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={pickerStyles.backdrop}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="关闭简历版本选择器" style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView style={pickerStyles.resumeSheet} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Text style={pickerStyles.title}>选择简历版本</Text>
          <ScrollView style={pickerStyles.options} contentContainerStyle={pickerStyles.optionsContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="未指定"
              accessibilityState={{ selected: selected === "" }}
              style={[pickerStyles.item, selected === "" && pickerStyles.itemActive]}
              onPress={() => select("")}
            >
              <Text style={[pickerStyles.itemText, selected === "" && pickerStyles.itemTextActive]}>未指定</Text>
              {selected === "" && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
            {options.map((option) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={option}
                accessibilityState={{ selected: selected === option }}
                key={option}
                style={[pickerStyles.item, selected === option && pickerStyles.itemActive]}
                onPress={() => select(option)}
              >
                <Text style={[pickerStyles.itemText, selected === option && pickerStyles.itemTextActive]}>{option}</Text>
                {selected === option && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={pickerStyles.customVersion}>
            <Text style={pickerStyles.customVersionLabel}>新版本名称</Text>
            <View style={pickerStyles.customVersionRow}>
              <TextInput
                style={pickerStyles.customVersionInput}
                value={draft}
                onChangeText={setDraft}
                placeholder="输入新版本名称"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={() => { if (draft.trim()) select(draft.trim()); }}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="使用新简历版本"
                accessibilityState={{ disabled: !draft.trim() }}
                disabled={!draft.trim()}
                style={[pickerStyles.customVersionButton, !draft.trim() && pickerStyles.disabled]}
                onPress={() => select(draft.trim())}
              >
                <Text style={pickerStyles.customVersionButtonText}>使用</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function PickerModal({ visible, items, labels, selected, onSelect, onClose }: {
  visible: boolean;
  items: readonly string[];
  labels?: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} onPress={onClose}>
        <View style={pickerStyles.sheet}>
          <Text style={pickerStyles.title}>请选择</Text>
          <ScrollView testID="picker-options-scroll-view" nestedScrollEnabled showsVerticalScrollIndicator>
            {items.map((item, i) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={labels ? labels[i] : item}
                accessibilityState={{ selected: selected === item }}
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
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: spacing.xl },
  sheet: { maxHeight: "80%", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
  resumeSheet: { height: "80%", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
  title: { fontSize: 16, fontWeight: fonts.bold, color: colors.text, marginBottom: spacing.md, textAlign: "center" },
  options: { flex: 1 },
  optionsContent: { paddingBottom: spacing.md },
  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md },
  itemActive: { backgroundColor: colors.primaryLight },
  itemText: { fontSize: 15, color: colors.text },
  itemTextActive: { color: colors.primaryText, fontWeight: fonts.bold },
  customVersion: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.sm },
  customVersionLabel: { fontSize: 13, color: colors.muted, fontWeight: fonts.semibold },
  customVersionRow: { flexDirection: "row", gap: spacing.sm },
  customVersionInput: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.bg },
  customVersionButton: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  customVersionButtonText: { color: colors.headerText, fontWeight: fonts.bold },
  disabled: { opacity: 0.5 },
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
