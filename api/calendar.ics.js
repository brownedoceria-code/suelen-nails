import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// ===== MESMA CONFIGURAÇÃO DO FIREBASE USADA NO APP =====
const firebaseConfig = {
  apiKey: "AIzaSyA3xsA_73IwLxwzS6X3paS_npDOGE2dvbQ",
  authDomain: "suelen-nails.firebaseapp.com",
  projectId: "suelen-nails",
  storageBucket: "suelen-nails.firebasestorage.app",
  messagingSenderId: "261579725948",
  appId: "1:261579725948:web:f788b6a6f3bd6abfee7df9",
  measurementId: "G-6P93GBGDXQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function pad(n) {
  return n.toString().padStart(2, "0");
}

// Converte data (YYYY-MM-DD) + minutos locais (horário do Brasil) para
// formato UTC do iCalendar. Brasil = UTC-3 (sem horário de verão atualmente).
function toICSDateUTC(dateStr, minutesLocal) {
  const [y, m, d] = dateStr.split("-").map(Number);
  let hour = Math.floor(minutesLocal / 60) + 3;
  const minute = minutesLocal % 60;
  let day = d;
  if (hour >= 24) { hour -= 24; day += 1; }
  return `${y}${pad(m)}${pad(day)}T${pad(hour)}${pad(minute)}00Z`;
}

function escapeICS(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export default async function handler(req, res) {
  try {
    const snapshot = await getDocs(collection(db, "bookings"));
    const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const now = new Date();
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Suelen Nails Designer//Agenda//PT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Suelen Nail's Designer",
      "X-WR-TIMEZONE:America/Sao_Paulo",
    ];

    bookings.forEach(b => {
      const duration = b.duration || 120;
      const start = toICSDateUTC(b.date, b.startMinutes);
      const end = toICSDateUTC(b.date, b.startMinutes + duration);

      lines.push(
        "BEGIN:VEVENT",
        `UID:${b.id}@suelen-nails`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeICS(b.service + " - " + b.name)}`,
        `DESCRIPTION:${escapeICS("Telefone: " + b.phone + " | Valor: R$ " + b.price + ",00")}`,
        "END:VEVENT"
      );
    });

    lines.push("END:VCALENDAR");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(lines.join("\r\n"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Erro ao gerar calendário");
  }
}