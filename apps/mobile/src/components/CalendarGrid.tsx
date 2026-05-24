import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, eventDotColors, fonts, radius, spacing } from "../theme";
import type { CalendarItem } from "@job-tracker/core";

interface Props {
  year: number;
  month: number;
  selectedDate: string;
  today: string;
  events: CalendarItem[];
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const monthNames = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const dayHeaders = ["日","一","二","三","四","五","六"];

export default function CalendarGrid({ year, month, selectedDate, today, events, onSelectDate, onPrevMonth, onNextMonth }: Props) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventDot = (day: number) => {
    // date in YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = events.filter((e) => e.date === dateStr);
    if (dayEvents.length === 0) return null;
    const types = [...new Set(dayEvents.map((e) => e.type))];
    const colorsSet = types.map((t) => eventDotColors[t] ?? eventDotColors.default).slice(0, 3);
    return colorsSet;
  };

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.monthBtn}>
          <Text style={styles.monthBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{year}年 {monthNames[month]}</Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.monthBtn}>
          <Text style={styles.monthBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.weekRow}>
        {dayHeaders.map((d) => (
          <View key={d} style={styles.dayCell}>
            <Text style={styles.dayHeader}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, weekIdx) => (
        <View key={weekIdx} style={styles.weekRow}>
          {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, idx) => {
            if (day === null) return <View key={`e-${idx}`} style={styles.dayCell} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const dots = getEventDot(day);

            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayCell, isSelected && styles.daySelected, isToday && styles.dayToday]}
                onPress={() => onSelectDate(dateStr)}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isToday && styles.dayTextToday]}>
                  {day}
                </Text>
                {dots && (
                  <View style={styles.dotRow}>
                    {dots.map((c, i) => (
                      <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  monthTitle: { fontSize: 16, fontWeight: fonts.bold, color: colors.text },
  monthBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  monthBtnText: { fontSize: 22, color: colors.primary, fontWeight: fonts.bold },
  weekRow: { flexDirection: "row" },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 6 },
  dayHeader: { fontSize: 12, color: colors.muted, fontWeight: fonts.medium },
  daySelected: { backgroundColor: colors.primaryLight, borderRadius: radius.md },
  dayToday: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md },
  dayText: { fontSize: 14, color: colors.text },
  dayTextSelected: { color: colors.primaryText, fontWeight: fonts.bold },
  dayTextToday: { color: colors.primary, fontWeight: fonts.bold },
  dotRow: { flexDirection: "row", gap: 2, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
