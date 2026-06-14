import { useState, useEffect, useRef } from "react";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

const DAY_TYPES = [
  { id: "work",    label: "Утренняя смена",  color: "#f5c842", text: "#7a5c00" },
  { id: "night",   label: "Ночная смена",    color: "#7c4dff", text: "#fff" },
  { id: "off",     label: "Выходной",        color: "#4caf7d", text: "#fff" },
  { id: "holiday", label: "Праздник",        color: "#e94560", text: "#fff" },
  { id: "bank",    label: "Банк",            color: "#5bc8f5", text: "#0a4a6e" },
  { id: "vacation",label: "Отпуск",          color: "#5b8af5", text: "#fff" },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function toKey(year, month, day) {
  return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function pad(n) { return String(n).padStart(2,"0"); }

export default function CalendarNotepad() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(toKey(today.getFullYear(), today.getMonth(), today.getDate()));
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cal-notes") || "{}"); } catch { return {}; }
  });
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cal-reminders") || "{}"); } catch { return {}; }
  });
  const [dayTypes, setDayTypes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cal-daytypes") || "{}"); } catch { return {}; }
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [draft, setDraft] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [activeTab, setActiveTab] = useState("note");
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setDraft(notes[selected] || "");
    setActiveTab("note");
    setShowColorPicker(false);
  }, [selected]);

  useEffect(() => {
    try { localStorage.setItem("cal-notes", JSON.stringify(notes)); } catch {}
  }, [notes]);
  useEffect(() => {
    try { localStorage.setItem("cal-reminders", JSON.stringify(reminders)); } catch {}
  }, [reminders]);
  useEffect(() => {
    try { localStorage.setItem("cal-daytypes", JSON.stringify(dayTypes)); } catch {}
  }, [dayTypes]);

  useEffect(() => {
    function checkReminders() {
      const now = new Date();
      const key = toKey(now.getFullYear(), now.getMonth(), now.getDate());
      const dayReminders = reminders[key] || [];
      const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      dayReminders.forEach(r => {
        if (r.time === nowTime && !r.fired) {
          showToast(`🔔 ${r.text}`);
          setReminders(prev => {
            const updated = { ...prev };
            updated[key] = (updated[key] || []).map(x =>
              x.id === r.id ? { ...x, fired: true } : x
            );
            return updated;
          });
          if (Notification.permission === "granted") {
            new Notification("Напоминание", { body: r.text });
          }
        }
      });
    }
    checkReminders();
    const id = setInterval(checkReminders, 30000);
    return () => clearInterval(id);
  }, [reminders]);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }

  function setDayType(typeId) {
    setDayTypes(prev => {
      const current = prev[selected];
      // повторное нажатие — убирает цвет
      if (current === typeId) {
        const updated = { ...prev };
        delete updated[selected];
        return updated;
      }
      return { ...prev, [selected]: typeId };
    });
    setShowColorPicker(false);
  }

  function addReminder() {
    if (!reminderText.trim()) return;
    const newR = { id: Date.now(), text: reminderText.trim(), time: reminderTime, fired: false };
    setReminders(prev => ({
      ...prev,
      [selected]: [...(prev[selected] || []), newR],
    }));
    setReminderText("");
    showToast("✓ Напоминание добавлено");
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function deleteReminder(key, id) {
    setReminders(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(r => r.id !== id),
    }));
  }

  function saveNote() {
    setNotes(n => ({ ...n, [selected]: draft }));
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const [selYear, selMonth, selDay] = selected.split("-").map(Number);
  const selDate = new Date(selYear, selMonth - 1, selDay);
  const selLabel = selDate.toLocaleDateString("ru-RU", { weekday:"long", day:"numeric", month:"long" });
  const selReminders = reminders[selected] || [];
  const selDayType = DAY_TYPES.find(t => t.id === dayTypes[selected]);

  return (
    <div style={{
      height: "100dvh",
      background: "#1a1a2e",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Georgia, serif",
      overflow: "hidden",
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
          background: "#16213e", color: "#fff", padding: "10px 20px",
          borderRadius: "12px", fontSize: "14px", fontFamily: "sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: "1px solid #e94560",
          zIndex: 1000, whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* TOP: Calendar */}
      <div style={{
        flex: "0 0 50%",
        background: "#16213e",
        display: "flex",
        flexDirection: "column",
        padding: "16px 16px 8px",
        overflow: "hidden",
      }}>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <div style={{ textAlign: "center" }}>
            <span style={{ color: "#e94560", fontWeight: "bold", fontSize: "18px" }}>{MONTHS[month]}</span>
            <span style={{ color: "#8892a4", fontSize: "14px", marginLeft: "8px" }}>{year}</span>
          </div>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>

        {/* Weekdays */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: "4px" }}>
          {WEEKDAYS.map(w => (
            <div key={w} style={{ textAlign: "center", color: "#e94560", fontSize: "11px", fontWeight: "bold", fontFamily: "sans-serif", padding: "2px 0" }}>
              {w}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px", flex: 1 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const key = toKey(year, month, d);
            const isToday = key === todayKey;
            const isSel = key === selected;
            const hasNote = !!notes[key];
            const hasReminder = (reminders[key] || []).length > 0;
            const dtype = DAY_TYPES.find(t => t.id === dayTypes[key]);

            let bg = "transparent";
            let color = "#c8d0dc";
            let border = "1px solid transparent";

            if (dtype) {
              bg = dtype.color;
              color = dtype.text;
            }
            if (isSel) {
              bg = dtype ? dtype.color : "#e94560";
              color = dtype ? dtype.text : "#fff";
              border = "2px solid #fff";
            } else if (isToday && !dtype) {
              bg = "#0f3460";
              color = "#e94560";
              border = "1px solid #e94560";
            }

            return (
              <button key={key} onClick={() => setSelected(key)} style={{
                background: bg,
                color: color,
                border: border,
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "sans-serif",
                fontSize: "14px",
                fontWeight: isSel ? "bold" : "normal",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                padding: "0",
              }}>
                {d}
                <span style={{ position: "absolute", bottom: "2px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "2px" }}>
                  {hasNote && <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: dtype ? "rgba(0,0,0,0.3)" : "#e94560", display: "inline-block" }} />}
                  {hasReminder && <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: dtype ? "rgba(0,0,0,0.3)" : "#f0c040", display: "inline-block" }} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {DAY_TYPES.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: t.color, display: "inline-block" }} />
              <span style={{ color: "#8892a4", fontSize: "10px", fontFamily: "sans-serif" }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM: Notes/Reminders */}
      <div style={{
        flex: "0 0 50%",
        background: "#fdf6e3",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: selDayType ? selDayType.color : "#e94560", padding: "10px 16px 0", transition: "background 0.3s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ color: selDayType ? selDayType.text : "#fff", fontSize: "14px", fontWeight: "bold", textTransform: "capitalize" }}>
                {selLabel}
              </div>
              {selDayType && (
                <span style={{
                  background: "rgba(0,0,0,0.15)", color: selDayType.text,
                  borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontFamily: "sans-serif",
                }}>
                  {selDayType.label}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {/* Color picker button */}
              <button onClick={() => setShowColorPicker(p => !p)} style={{
                background: "rgba(255,255,255,0.25)",
                color: selDayType ? selDayType.text : "#fff",
                border: "none", borderRadius: "8px",
                padding: "5px 10px", cursor: "pointer",
                fontFamily: "sans-serif", fontSize: "13px",
              }} title="Тип дня">🎨</button>
              {activeTab === "note" && (
                <button onClick={saveNote} style={{
                  background: "#fff", color: selDayType ? selDayType.color : "#e94560",
                  border: "none", borderRadius: "8px",
                  padding: "5px 14px", fontWeight: "bold", fontSize: "12px",
                  cursor: "pointer", fontFamily: "sans-serif",
                }}>Сохранить</button>
              )}
            </div>
          </div>

          {/* Color picker panel */}
          {showColorPicker && (
            <div style={{
              display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap",
            }}>
              {DAY_TYPES.map(t => (
                <button key={t.id} onClick={() => setDayType(t.id)} style={{
                  background: t.color,
                  color: t.text,
                  border: dayTypes[selected] === t.id ? "2px solid #fff" : "2px solid transparent",
                  borderRadius: "8px", padding: "5px 10px",
                  cursor: "pointer", fontFamily: "sans-serif", fontSize: "12px", fontWeight: "bold",
                }}>
                  {t.label}
                </button>
              ))}
              {dayTypes[selected] && (
                <button onClick={() => setDayType(dayTypes[selected])} style={{
                  background: "rgba(255,255,255,0.2)", color: "#fff",
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderRadius: "8px", padding: "5px 10px",
                  cursor: "pointer", fontFamily: "sans-serif", fontSize: "12px",
                }}>✕ Убрать</button>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px" }}>
            {["note", "reminder"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: activeTab === tab ? "#fdf6e3" : "rgba(255,255,255,0.2)",
                color: activeTab === tab ? (selDayType ? selDayType.color : "#e94560") : (selDayType ? selDayType.text : "#fff"),
                border: "none", borderRadius: "8px 8px 0 0",
                padding: "6px 14px", cursor: "pointer",
                fontFamily: "sans-serif", fontSize: "12px",
                fontWeight: activeTab === tab ? "bold" : "normal",
              }}>
                {tab === "note" ? "📝 Заметка" : `🔔 Напоминания${selReminders.length ? ` (${selReminders.length})` : ""}`}
              </button>
            ))}
          </div>
        </div>

        {/* Note tab */}
        {activeTab === "note" && (
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute", left: 0, right: 0,
                top: `${44 + i * 28}px`, height: "1px", background: "#e8dfc8",
              }} />
            ))}
            <div style={{ position: "absolute", left: "44px", top: 0, bottom: 0, width: "1px", background: "#f4a8b2" }} />
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Напишите заметку на этот день..."
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                background: "transparent", border: "none", outline: "none", resize: "none",
                padding: "16px 16px 16px 56px",
                fontSize: "15px", color: "#3a2e1e",
                lineHeight: "28px", fontFamily: "Georgia, serif", boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Reminder tab */}
        {activeTab === "reminder" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "#fff8e8", borderRadius: "10px", padding: "12px", border: "1px solid #e8dfc8" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} style={{
                  border: "1px solid #d4c4a0", borderRadius: "8px", padding: "7px 10px",
                  fontFamily: "sans-serif", fontSize: "14px", color: "#3a2e1e",
                  background: "#fff", outline: "none", width: "100px",
                }} />
                <input value={reminderText} onChange={e => setReminderText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addReminder()}
                  placeholder="Текст напоминания..." style={{
                  flex: 1, border: "1px solid #d4c4a0", borderRadius: "8px",
                  padding: "7px 10px", fontFamily: "Georgia, serif", fontSize: "14px",
                  color: "#3a2e1e", background: "#fff", outline: "none",
                }} />
              </div>
              <button onClick={addReminder} style={{
                width: "100%", background: "#e94560", color: "#fff", border: "none",
                borderRadius: "8px", padding: "8px", cursor: "pointer",
                fontFamily: "sans-serif", fontSize: "13px", fontWeight: "bold",
              }}>+ Добавить напоминание</button>
            </div>
            {selReminders.length === 0 ? (
              <div style={{ color: "#b8a880", fontSize: "14px", fontFamily: "sans-serif", textAlign: "center", padding: "16px 0" }}>
                Нет напоминаний на этот день
              </div>
            ) : selReminders.map(r => (
              <div key={r.id} style={{
                background: r.fired ? "#f0f4e8" : "#fff",
                border: "1px solid #e0d4b8", borderRadius: "10px",
                padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px",
              }}>
                <span style={{
                  background: r.fired ? "#9caf7a" : "#e94560", color: "#fff",
                  borderRadius: "6px", padding: "3px 8px",
                  fontFamily: "sans-serif", fontSize: "13px", fontWeight: "bold",
                }}>{r.time}</span>
                <span style={{
                  flex: 1, fontFamily: "Georgia, serif", fontSize: "14px",
                  color: r.fired ? "#888" : "#3a2e1e",
                  textDecoration: r.fired ? "line-through" : "none",
                }}>{r.text}</span>
                <button onClick={() => deleteReminder(selected, r.id)} style={{
                  background: "transparent", border: "none", color: "#c8a0a0",
                  cursor: "pointer", fontSize: "18px", padding: "0 4px", lineHeight: 1,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "note" && (
          <div style={{ padding: "6px 16px", borderTop: "1px solid #e8dfc8" }}>
            {notes[selected] === draft
              ? <span style={{ color: "#9caf7a", fontSize: "11px", fontFamily: "sans-serif" }}>✓ Сохранено</span>
              : <span style={{ color: "#c8a870", fontSize: "11px", fontFamily: "sans-serif" }}>● Не сохранено</span>
            }
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn = {
  background: "transparent", border: "none", color: "#8892a4",
  fontSize: "26px", cursor: "pointer", padding: "4px 12px", borderRadius: "6px", lineHeight: 1,
};
