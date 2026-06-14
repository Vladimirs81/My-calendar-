import { useState, useEffect, useRef } from "react";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

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
  const [draft, setDraft] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [activeTab, setActiveTab] = useState("note"); // "note" | "reminder"
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setDraft(notes[selected] || "");
    setActiveTab("note");
  }, [selected]);

  useEffect(() => {
    try { localStorage.setItem("cal-notes", JSON.stringify(notes)); } catch {}
  }, [notes]);
  useEffect(() => {
    try { localStorage.setItem("cal-reminders", JSON.stringify(reminders)); } catch {}
  }, [reminders]);

  // Check reminders every 30s
  useEffect(() => {
    function checkReminders() {
      const now = new Date();
      const key = toKey(now.getFullYear(), now.getMonth(), now.getDate());
      const dayReminders = reminders[key] || [];
      const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      dayReminders.forEach(r => {
        if (r.time === nowTime && !r.fired) {
          showToast(`🔔 ${r.text}`);
          // Mark as fired
          setReminders(prev => {
            const updated = { ...prev };
            updated[key] = (updated[key] || []).map(x =>
              x.id === r.id ? { ...x, fired: true } : x
            );
            return updated;
          });
          // Browser notification
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
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }

  function requestNotifPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
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
    requestNotifPermission();
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

  return (
    <div style={{
      minHeight:"100vh", background:"#1a1a2e",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"Georgia, serif", padding:"20px", position:"relative",
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:"24px", left:"50%", transform:"translateX(-50%)",
          background:"#16213e", color:"#fff", padding:"12px 24px",
          borderRadius:"12px", fontSize:"14px", fontFamily:"sans-serif",
          boxShadow:"0 8px 32px rgba(0,0,0,0.4)", border:"1px solid #e94560",
          zIndex:1000, whiteSpace:"nowrap",
        }}>
          {toast}
        </div>
      )}

      <div style={{
        display:"flex", maxWidth:"860px", width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)", borderRadius:"16px", overflow:"hidden",
      }}>
        {/* Left: Calendar */}
        <div style={{
          background:"#16213e", width:"290px", minWidth:"250px",
          padding:"28px 22px", borderRight:"1px solid #0f3460",
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
            <button onClick={prevMonth} style={navBtn}>‹</button>
            <div style={{ textAlign:"center" }}>
              <div style={{ color:"#e94560", fontWeight:"bold", fontSize:"17px", letterSpacing:"0.04em" }}>{MONTHS[month]}</div>
              <div style={{ color:"#8892a4", fontSize:"13px" }}>{year}</div>
            </div>
            <button onClick={nextMonth} style={navBtn}>›</button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"2px", marginBottom:"6px" }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{ textAlign:"center", color:"#e94560", fontSize:"11px", fontWeight:"bold", padding:"4px 0", fontFamily:"sans-serif" }}>{w}</div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"3px" }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />;
              const key = toKey(year, month, d);
              const isToday = key === todayKey;
              const isSel = key === selected;
              const hasNote = !!notes[key];
              const hasReminder = (reminders[key] || []).length > 0;
              return (
                <button key={key} onClick={() => setSelected(key)} style={{
                  background: isSel ? "#e94560" : isToday ? "#0f3460" : "transparent",
                  color: isSel ? "#fff" : isToday ? "#e94560" : "#c8d0dc",
                  border: isToday && !isSel ? "1px solid #e94560" : "1px solid transparent",
                  borderRadius:"8px", padding:"7px 3px", cursor:"pointer",
                  fontFamily:"sans-serif", fontSize:"13px", position:"relative", transition:"background 0.15s",
                }}>
                  {d}
                  <span style={{ position:"absolute", bottom:"3px", left:"50%", transform:"translateX(-50%)", display:"flex", gap:"2px" }}>
                    {hasNote && <span style={{ width:"3px", height:"3px", borderRadius:"50%", background: isSel ? "#fff" : "#e94560", display:"inline-block" }} />}
                    {hasReminder && <span style={{ width:"3px", height:"3px", borderRadius:"50%", background: isSel ? "#ffe080" : "#f0c040", display:"inline-block" }} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop:"20px", borderTop:"1px solid #0f3460", paddingTop:"14px" }}>
            <div style={{ color:"#8892a4", fontSize:"11px", fontFamily:"sans-serif", textAlign:"center", lineHeight:"1.8" }}>
              <span style={{ color:"#e94560" }}>●</span> запись &nbsp; <span style={{ color:"#f0c040" }}>●</span> напоминание
            </div>
            <div style={{ color:"#8892a4", fontSize:"11px", fontFamily:"sans-serif", textAlign:"center", marginTop:"6px" }}>
              Записей: {Object.keys(notes).filter(k => notes[k]).length} &nbsp;|&nbsp;
              Напоминаний: {Object.values(reminders).flat().length}
            </div>
          </div>
        </div>

        {/* Right: Editor */}
        <div style={{ flex:1, background:"#fdf6e3", display:"flex", flexDirection:"column", minHeight:"500px" }}>
          {/* Header */}
          <div style={{ background:"#e94560", padding:"18px 28px 0" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
              <div>
                <div style={{ color:"#fff", fontSize:"11px", letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"sans-serif", opacity:0.85 }}>Запись</div>
                <div style={{ color:"#fff", fontSize:"16px", fontWeight:"bold", marginTop:"2px", textTransform:"capitalize" }}>{selLabel}</div>
              </div>
              {activeTab === "note" && (
                <button onClick={saveNote} style={{
                  background:"#fff", color:"#e94560", border:"none", borderRadius:"8px",
                  padding:"8px 18px", fontWeight:"bold", fontSize:"13px", cursor:"pointer",
                  fontFamily:"sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.12)",
                }}>Сохранить</button>
              )}
            </div>
            {/* Tabs */}
            <div style={{ display:"flex", gap:"4px" }}>
              {["note","reminder"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  background: activeTab === tab ? "#fdf6e3" : "rgba(255,255,255,0.2)",
                  color: activeTab === tab ? "#e94560" : "#fff",
                  border:"none", borderRadius:"8px 8px 0 0", padding:"8px 18px",
                  cursor:"pointer", fontFamily:"sans-serif", fontSize:"13px", fontWeight: activeTab === tab ? "bold" : "normal",
                }}>
                  {tab === "note" ? "📝 Заметка" : `🔔 Напоминания${selReminders.length ? ` (${selReminders.length})` : ""}`}
                </button>
              ))}
            </div>
          </div>

          {/* Note tab */}
          {activeTab === "note" && (
            <>
              <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
                {Array.from({length:18}).map((_,i) => (
                  <div key={i} style={{ position:"absolute", left:0, right:0, top:`${52+i*28}px`, height:"1px", background:"#e8dfc8" }} />
                ))}
                <div style={{ position:"absolute", left:"52px", top:0, bottom:0, width:"1px", background:"#f4a8b2" }} />
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Напишите заметку на этот день..."
                  style={{
                    position:"absolute", inset:0, width:"100%", height:"100%",
                    background:"transparent", border:"none", outline:"none", resize:"none",
                    padding:"20px 24px 20px 68px", fontSize:"16px", color:"#3a2e1e",
                    lineHeight:"28px", fontFamily:"Georgia, serif", boxSizing:"border-box",
                  }}
                />
              </div>
              <div style={{ padding:"10px 28px", borderTop:"1px solid #e8dfc8" }}>
                {notes[selected] === draft
                  ? <span style={{ color:"#9caf7a", fontSize:"12px", fontFamily:"sans-serif" }}>✓ Сохранено</span>
                  : <span style={{ color:"#c8a870", fontSize:"12px", fontFamily:"sans-serif" }}>● Есть несохранённые изменения</span>
                }
              </div>
            </>
          )}

          {/* Reminder tab */}
          {activeTab === "reminder" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 28px", gap:"20px", overflowY:"auto" }}>
              {/* Add reminder form */}
              <div style={{
                background:"#fff8e8", borderRadius:"12px", padding:"18px 20px",
                border:"1px solid #e8dfc8",
              }}>
                <div style={{ color:"#7a5c2e", fontSize:"13px", fontFamily:"sans-serif", fontWeight:"bold", marginBottom:"12px" }}>
                  Новое напоминание
                </div>
                <div style={{ display:"flex", gap:"10px", alignItems:"center", marginBottom:"10px" }}>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={e => setReminderTime(e.target.value)}
                    style={{
                      border:"1px solid #d4c4a0", borderRadius:"8px", padding:"8px 12px",
                      fontFamily:"sans-serif", fontSize:"14px", color:"#3a2e1e",
                      background:"#fff", outline:"none", width:"110px",
                    }}
                  />
                  <input
                    value={reminderText}
                    onChange={e => setReminderText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addReminder()}
                    placeholder="Текст напоминания..."
                    style={{
                      flex:1, border:"1px solid #d4c4a0", borderRadius:"8px",
                      padding:"8px 12px", fontFamily:"Georgia, serif", fontSize:"14px",
                      color:"#3a2e1e", background:"#fff", outline:"none",
                    }}
                  />
                  <button onClick={addReminder} style={{
                    background:"#e94560", color:"#fff", border:"none", borderRadius:"8px",
                    padding:"9px 16px", cursor:"pointer", fontFamily:"sans-serif",
                    fontSize:"13px", fontWeight:"bold", whiteSpace:"nowrap",
                  }}>+ Добавить</button>
                </div>
                <div style={{ color:"#a0926e", fontSize:"11px", fontFamily:"sans-serif" }}>
                  💡 Браузер уведомит вас в выбранное время (вкладка должна быть открыта)
                </div>
              </div>

              {/* List of reminders for this day */}
              {selReminders.length === 0 ? (
                <div style={{ color:"#b8a880", fontSize:"14px", fontFamily:"sans-serif", textAlign:"center", padding:"30px 0" }}>
                  Нет напоминаний на этот день
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {selReminders.map(r => (
                    <div key={r.id} style={{
                      background: r.fired ? "#f0f4e8" : "#fff",
                      border:"1px solid #e0d4b8", borderRadius:"10px",
                      padding:"12px 16px", display:"flex", alignItems:"center", gap:"12px",
                    }}>
                      <span style={{
                        background: r.fired ? "#9caf7a" : "#e94560",
                        color:"#fff", borderRadius:"6px", padding:"3px 8px",
                        fontFamily:"sans-serif", fontSize:"13px", fontWeight:"bold", whiteSpace:"nowrap",
                      }}>{r.time}</span>
                      <span style={{ flex:1, fontFamily:"Georgia, serif", fontSize:"14px", color: r.fired ? "#888" : "#3a2e1e",
                        textDecoration: r.fired ? "line-through" : "none" }}>
                        {r.text}
                      </span>
                      {r.fired && <span style={{ color:"#9caf7a", fontSize:"12px", fontFamily:"sans-serif" }}>✓</span>}
                      <button onClick={() => deleteReminder(selected, r.id)} style={{
                        background:"transparent", border:"none", color:"#c8a0a0",
                        cursor:"pointer", fontSize:"16px", padding:"0 4px", lineHeight:1,
                      }} title="Удалить">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const navBtn = {
  background:"transparent", border:"none", color:"#8892a4",
  fontSize:"22px", cursor:"pointer", padding:"4px 10px",
  borderRadius:"6px", lineHeight:1,
};
