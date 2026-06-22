import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";

// ===== CONFIGURAÇÃO DO FIREBASE =====
const firebaseConfig = {
  apiKey: "AIzaSyA3xsA_73IwLxwzS6X3paS_npDOGE2dvbQ",
  authDomain: "suelen-nails.firebaseapp.com",
  projectId: "suelen-nails",
  storageBucket: "suelen-nails.firebasestorage.app",
  messagingSenderId: "261579725948",
  appId: "1:261579725948:web:f788b6a6f3bd6abfee7df9",
  measurementId: "G-6P93GBGDXQ"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
// =====================================

const SERVICES = [
  { id: 1, name: "Molde F1", price: 160 },
  { id: 2, name: "Alongamento", price: 160 },
  { id: 3, name: "Banho de Gel", price: 100 },
  { id: 4, name: "Esmaltação em Gel", price: 90 },
  { id: 5, name: "Pé Simples", price: 45 },
  { id: 6, name: "Mão e Pé Simples", price: 65 },
  { id: 7, name: "Manutenção", price: 130 },
  { id: 8, name: "Manutenção Outra Profissional Alongamento", price: 160 },
  { id: 9, name: "Manutenção Outra Profissional Banho de Gel", price: 130 },
];

const ADMIN_PASSWORD = "suelen2024";
const SUELEN_WHATSAPP = "5521981607793";
const APPOINTMENT_BLOCK_MINUTES = 120;
const CORTE_STUDIO = 0.40; // cliente vinda direto do salão: Suelen perde 40%
const CORTE_DIRETO = 0.30; // cliente vinda direto pela Suelen: Suelen perde 30%
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const getBusinessHours = (dow) => {
  if (dow === 0 || dow === 1) return null;
  return { start: 8 * 60, end: 20 * 60 };
};

const formatTime = (m) => `${Math.floor(m/60).toString().padStart(2,"0")}:${(m%60).toString().padStart(2,"0")}`;
const formatDateBR = (s) => { if (!s) return ""; const [y,mo,d] = s.split("-"); return `${d}/${mo}/${y}`; };
const getDayName = (s) => { if (!s) return ""; return DAYS_PT[new Date(s+"T00:00:00").getDay()]; };

const waLink = (phone, msg) => `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

const msgClienteParaSuelen = (b) =>
  "Ola, Suelen! Gostaria de confirmar meu agendamento:\n\n" +
  "*Servico:* " + b.service + "\n" +
  "*Data:* " + getDayName(b.date) + ", " + formatDateBR(b.date) + "\n" +
  "*Horario:* " + formatTime(b.startMinutes) + " - " + formatTime(b.startMinutes + b.duration) + "\n" +
  "*Valor:* R$ " + b.price + ",00\n\n" +
  "*Nome:* " + b.name + "\n*Telefone:* " + b.phone;

const getLinkSuelenParaCliente = (b) => {
  const phone = b.phone.replace(/\D/g, "");
  const fullPhone = phone.startsWith("55") ? phone : "55" + phone;
  const msg =
    "Ola, " + b.name.split(" ")[0] + "! Seu agendamento esta confirmado:\n\n" +
    "*Servico:* " + b.service + "\n" +
    "*Data:* " + getDayName(b.date) + ", " + formatDateBR(b.date) + "\n" +
    "*Horario:* " + formatTime(b.startMinutes) + " - " + formatTime(b.startMinutes + b.duration) + "\n" +
    "*Valor:* R$ " + b.price + ",00\n\n" +
    "Te espero!\n_Suelen Nail's Designer_";
  return waLink(fullPhone, msg);
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:#FAF7F4;color:#2C2017;min-height:100vh;}
  .app{min-height:100vh;background:#FAF7F4;}
  .header{background:#2C2017;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;}
  .logo{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:300;color:#F0D9C8;letter-spacing:2px;text-transform:uppercase;}
  .logo span{color:#C9956A;}
  .header-nav button{background:none;border:1px solid rgba(240,217,200,0.25);color:#F0D9C8;padding:7px 16px;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border-radius:2px;transition:all 0.2s;}
  .header-nav button:hover{background:rgba(240,217,200,0.1);}
  .hero{background:linear-gradient(135deg,#2C2017 0%,#4A3728 55%,#6B4E3D 100%);padding:60px 24px 52px;text-align:center;position:relative;overflow:hidden;}
  .hero::before{content:'';position:absolute;top:-40%;left:-20%;width:140%;height:200%;background:radial-gradient(ellipse at 60% 40%,rgba(201,149,106,0.18) 0%,transparent 60%);}
  .hero-inner{position:relative;z-index:1;}
  .eyebrow{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C9956A;margin-bottom:14px;}
  .hero-title{font-family:'Cormorant Garamond',serif;font-size:50px;font-weight:300;color:#FAF7F4;line-height:1.1;margin-bottom:8px;}
  .hero-title em{font-style:italic;color:#F0D9C8;}
  .hero-sub{font-size:12px;color:rgba(240,217,200,0.55);letter-spacing:1.5px;margin-bottom:32px;}
  .btn{background:#C9956A;color:#FAF7F4;border:none;padding:13px 34px;font-family:'DM Sans',sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;border-radius:2px;transition:all 0.25s;font-weight:500;}
  .btn:hover{background:#B8845A;transform:translateY(-1px);box-shadow:0 8px 24px rgba(201,149,106,0.3);}
  .btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none;}
  .btn-full{width:100%;margin-top:10px;}
  .btn-ghost{background:none;border:1px solid rgba(201,149,106,0.4);color:#8B6E5A;padding:10px 24px;font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border-radius:2px;font-family:'DM Sans',sans-serif;transition:all 0.2s;width:100%;}
  .btn-ghost:hover{border-color:#C9956A;color:#C9956A;}
  .btn-wa{background:#25D366;color:#fff;border:none;padding:13px 24px;font-family:'DM Sans',sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border-radius:2px;transition:all 0.25s;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;width:100%;}
  .btn-wa:hover{background:#1ebe5a;transform:translateY(-1px);box-shadow:0 8px 24px rgba(37,211,102,0.3);}
  .btn-wa-sm{background:#25D366;color:#fff;border:none;padding:5px 12px;font-family:'DM Sans',sans-serif;font-size:11px;border-radius:3px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:5px;text-decoration:none;white-space:nowrap;}
  .btn-wa-sm:hover{background:#1ebe5a;}
  .section{padding:36px 24px 48px;max-width:580px;margin:0 auto;}
  .sec-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#2C2017;margin-bottom:4px;}
  .divider{width:38px;height:1px;background:#C9956A;margin-bottom:22px;}
  .service-card{background:#fff;border:1px solid rgba(201,149,106,0.2);border-radius:4px;padding:15px 18px;margin-bottom:9px;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;justify-content:space-between;gap:12px;}
  .service-card:hover,.service-card.sel{border-color:#C9956A;box-shadow:0 2px 14px rgba(201,149,106,0.13);}
  .service-card.sel{background:#FDF5EF;}
  .service-card.no-cursor{cursor:default;}
  .svc-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:400;color:#2C2017;}
  .svc-meta{font-size:12px;color:#8B6E5A;margin-top:2px;}
  .svc-price{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#C9956A;white-space:nowrap;}
  .breadcrumb{display:flex;align-items:center;gap:6px;margin-bottom:22px;flex-wrap:wrap;}
  .bc{padding:4px 11px;border-radius:12px;background:rgba(201,149,106,0.1);color:#A08070;font-size:11px;letter-spacing:0.5px;}
  .bc.active{background:#C9956A;color:#fff;}
  .back-btn{background:none;border:none;color:#8B6E5A;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:5px;margin-bottom:18px;padding:0;font-family:'DM Sans',sans-serif;}
  .back-btn:hover{color:#C9956A;}
  .calendar{background:#fff;border-radius:6px;border:1px solid rgba(201,149,106,0.2);overflow:hidden;margin-bottom:20px;}
  .cal-head{background:#2C2017;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;}
  .cal-head h3{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:300;color:#F0D9C8;text-transform:capitalize;}
  .cal-nav{background:none;border:none;color:#C9956A;cursor:pointer;font-size:20px;padding:2px 8px;line-height:1;}
  .cal-body{padding:14px;}
  .day-labels{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;}
  .day-lbl{text-align:center;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8B6E5A;padding:4px;}
  .days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
  .dc{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:13px;cursor:pointer;transition:all 0.13s;border:1px solid transparent;}
  .dc.off{color:#DDD;cursor:not-allowed;}
  .dc.avail{color:#2C2017;font-weight:500;}
  .dc.avail:hover{background:#FDF5EF;border-color:#C9956A;}
  .dc.picked{background:#C9956A;color:#fff;}
  .dc.no-slot{color:#CCBBB5;}
  .slots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;}
  .slot{background:#fff;border:1px solid rgba(201,149,106,0.3);color:#2C2017;padding:10px 4px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;border-radius:4px;transition:all 0.13s;text-align:center;}
  .slot:hover{border-color:#C9956A;background:#FDF5EF;}
  .slot.picked{background:#C9956A;border-color:#C9956A;color:#fff;}
  .form-group{margin-bottom:15px;}
  .form-label{display:block;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8B6E5A;margin-bottom:6px;font-weight:500;}
  .form-input{width:100%;padding:12px 14px;border:1px solid rgba(201,149,106,0.3);border-radius:4px;font-family:'DM Sans',sans-serif;font-size:15px;color:#2C2017;background:#fff;outline:none;transition:border-color 0.2s;}
  .form-input:focus{border-color:#C9956A;}
  .summary{background:#FDF5EF;border:1px solid rgba(201,149,106,0.25);border-radius:6px;padding:16px;margin-bottom:18px;}
  .sum-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(201,149,106,0.13);font-size:14px;}
  .sum-row:last-child{border-bottom:none;}
  .sum-lbl{color:#8B6E5A;}
  .sum-val{color:#2C2017;font-weight:500;}
  .sum-price{color:#C9956A;font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;}
  .confirm-wrap{text-align:center;padding-top:24px;}
  .confirm-icon{width:64px;height:64px;background:#C9956A;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:28px;color:#fff;}
  .confirm-actions{display:flex;flex-direction:column;gap:10px;margin-top:18px;}
  .admin-card{background:#fff;border:1px solid rgba(201,149,106,0.2);border-radius:6px;padding:15px;margin-bottom:9px;}
  .admin-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
  .admin-name{font-family:'Cormorant Garamond',serif;font-size:18px;color:#2C2017;}
  .admin-phone{font-size:12px;color:#8B6E5A;margin-top:2px;}
  .admin-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
  .del-btn{background:none;border:1px solid #FFCDD2;color:#E57373;padding:4px 10px;font-size:11px;border-radius:3px;cursor:pointer;font-family:'DM Sans',sans-serif;}
  .del-btn:hover{background:#FFEBEE;}
  .admin-details{font-size:13px;color:#4A3728;border-top:1px solid rgba(201,149,106,0.15);padding-top:9px;display:flex;flex-wrap:wrap;gap:12px;}
  .empty-st{text-align:center;padding:48px 24px;color:#8B6E5A;}
  .hint{font-size:11px;color:#A08070;text-align:center;margin-bottom:14px;}
  .loading-st{text-align:center;padding:40px 24px;color:#8B6E5A;font-size:13px;}
  .studio-toggle{background:#FDF5EF;border:1px solid rgba(201,149,106,0.35);color:#8B6E5A;padding:6px 12px;font-size:11px;letter-spacing:0.3px;border-radius:4px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;}
  .studio-toggle:hover{border-color:#C9956A;}
  .studio-toggle.on{background:#2C2017;color:#F0D9C8;border-color:#2C2017;}
  .net-row{background:rgba(201,149,106,0.08);}
`;

export default function App() {
  const [view, setView] = useState("home");
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState({ service: null, date: null, time: null });
  const [form, setForm] = useState({ name: "", phone: "" });
  const [adminPass, setAdminPass] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [month, setMonth] = useState(new Date());
  const [lastBooking, setLastBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminTab, setAdminTab] = useState("agendamentos");
  const [filterStart, setFilterStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-01`;
  });
  const [filterEnd, setFilterEnd] = useState(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${last.toString().padStart(2,"0")}`;
  });

  const setFilterToCurrentMonth = () => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    setFilterStart(`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-01`);
    setFilterEnd(`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${last.toString().padStart(2,"0")}`);
  };

  // Escuta o Firestore em tempo real: qualquer agendamento novo (de qualquer
  // pessoa, em qualquer dispositivo) aparece automaticamente aqui.
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setBookings(data);
        setLoadingBookings(false);
      },
      (err) => {
        console.error("Erro ao carregar agendamentos:", err);
        setLoadingBookings(false);
      }
    );
    return () => unsub();
  }, []);

  const addBooking = async (b) => {
    await addDoc(collection(db, "bookings"), b);
  };

  const removeBooking = async (id) => {
    await deleteDoc(doc(db, "bookings", id));
  };

  const toggleStudio = async (b) => {
    await updateDoc(doc(db, "bookings", b.id), { isStudio: !b.isStudio });
  };

  const getSlots = (dateStr) => {
    const dow = new Date(dateStr + "T00:00:00").getDay();
    const h = getBusinessHours(dow);
    if (!h) return [];
    const slots = [];
    for (let t = h.start; t + APPOINTMENT_BLOCK_MINUTES <= h.end; t += 30) {
      const ok = !bookings.some(b => {
        if (b.date !== dateStr) return false;
        const be = b.startMinutes + b.duration;
        return t < be && t + APPOINTMENT_BLOCK_MINUTES > b.startMinutes;
      });
      if (ok) slots.push(t);
    }
    return slots;
  };

  const getCalDays = () => {
    const y = month.getFullYear(), mo = month.getMonth();
    const first = new Date(y, mo, 1).getDay();
    const dim = new Date(y, mo + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    const days = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let d = 1; d <= dim; d++) {
      const dt = new Date(y, mo, d);
      const dow = dt.getDay();
      const dateStr = `${y}-${(mo+1).toString().padStart(2,"0")}-${d.toString().padStart(2,"0")}`;
      const closed = dow === 0 || dow === 1;
      const past = dt < today;
      const hasSlots = !closed && !past && getSlots(dateStr).length > 0;
      days.push({ d, dateStr, closed, past, hasSlots });
    }
    return days;
  };

  const submit = async () => {
    setSubmitting(true);
    const b = {
      service: sel.service.name,
      price: sel.service.price,
      duration: APPOINTMENT_BLOCK_MINUTES,
      date: sel.date,
      startMinutes: sel.time,
      name: form.name,
      phone: form.phone,
      isStudio: false
    };
    try {
      await addBooking(b);
      setLastBooking(b);
      setStep(5);
    } catch (e) {
      console.error("Erro ao salvar agendamento:", e);
      alert("Não foi possível salvar o agendamento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setSel({ service: null, date: null, time: null });
    setForm({ name: "", phone: "" });
    setLastBooking(null);
  };

  // ADMIN VIEW
  if (view === "admin") {
    const sorted = [...bookings].sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.startMinutes - b.startMinutes);
    return (
      <div className="app">
        <style>{CSS}</style>
        <div className="header">
          <span className="logo">Suelen <span>Nail's</span> Designer</span>
          <div className="header-nav"><button onClick={() => { setView("home"); setAdminAuth(false); setAdminPass(""); }}>← Início</button></div>
        </div>
        <div className="section">
          <div className="sec-title">Painel Admin</div>
          <div className="divider"/>
          {!adminAuth ? (
            <div>
              <div className="form-group">
                <label className="form-label">Senha de acesso</label>
                <input className="form-input" type="password" placeholder="••••••••" value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Senha incorreta"))} />
              </div>
              {adminError && <p style={{color:"#E57373",fontSize:"13px",marginBottom:"12px"}}>{adminError}</p>}
              <button className="btn btn-full" onClick={() => adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Senha incorreta")}>Entrar</button>
            </div>
          ) : (
            <div>
              <div className="breadcrumb" style={{marginBottom:"22px"}}>
                <span className={`bc${adminTab === "agendamentos" ? " active" : ""}`} style={{cursor:"pointer"}} onClick={() => setAdminTab("agendamentos")}>Agendamentos</span>
                <span className={`bc${adminTab === "faturamento" ? " active" : ""}`} style={{cursor:"pointer"}} onClick={() => setAdminTab("faturamento")}>Faturamento</span>
              </div>

              {loadingBookings ? (
                <div className="loading-st">Carregando agendamentos...</div>
              ) : adminTab === "faturamento" ? (
                (() => {
                  const filtered = bookings.filter(b => b.date >= filterStart && b.date <= filterEnd);
                  const total = filtered.reduce((sum, b) => sum + (b.price || 0), 0);
                  const studioBookings = filtered.filter(b => b.isStudio);
                  const diretoBookings = filtered.filter(b => !b.isStudio);
                  const totalStudio = studioBookings.reduce((sum, b) => sum + (b.price || 0), 0);
                  const totalDireto = diretoBookings.reduce((sum, b) => sum + (b.price || 0), 0);
                  const liquido = totalStudio * (1 - CORTE_STUDIO) + totalDireto * (1 - CORTE_DIRETO);
                  const porServico = {};
                  filtered.forEach(b => {
                    if (!porServico[b.service]) porServico[b.service] = { count: 0, total: 0 };
                    porServico[b.service].count += 1;
                    porServico[b.service].total += b.price || 0;
                  });
                  const servicosOrdenados = Object.entries(porServico).sort((a, b) => b[1].total - a[1].total);

                  return (
                    <div>
                      <div className="form-group">
                        <label className="form-label">De</label>
                        <input className="form-input" type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Até</label>
                        <input className="form-input" type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
                      </div>
                      <button className="btn-ghost" style={{marginBottom:"20px"}} onClick={setFilterToCurrentMonth}>Este mês</button>

                      <div className="summary">
                        <div className="sum-row"><span className="sum-lbl">Agendamentos no período</span><span className="sum-val">{filtered.length}</span></div>
                        <div className="sum-row"><span className="sum-lbl">Receita bruta</span><span className="sum-val">R$ {total.toFixed(2).replace(".", ",")}</span></div>
                        <div className="sum-row"><span className="sum-lbl">Clientes do Studio ({studioBookings.length})</span><span className="sum-val">R$ {totalStudio.toFixed(2).replace(".", ",")}</span></div>
                        <div className="sum-row"><span className="sum-lbl">Clientes diretos ({diretoBookings.length})</span><span className="sum-val">R$ {totalDireto.toFixed(2).replace(".", ",")}</span></div>
                        <div className="sum-row net-row"><span className="sum-lbl">Receita líquida (sua parte)</span><span className="sum-price">R$ {liquido.toFixed(2).replace(".", ",")}</span></div>
                      </div>
                      <p className="hint" style={{textAlign:"left",marginBottom:"20px"}}>
                        Studio: -40% por agendamento · Direto: -30% por agendamento
                      </p>

                      {servicosOrdenados.length === 0 ? (
                        <div className="empty-st"><p>Nenhum agendamento nesse período.</p></div>
                      ) : (
                        <div>
                          <div className="form-label" style={{marginBottom:"10px"}}>Por serviço (bruto)</div>
                          {servicosOrdenados.map(([nome, dados]) => (
                            <div key={nome} className="admin-card" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div>
                                <div className="admin-name" style={{fontSize:"16px"}}>{nome}</div>
                                <div className="admin-phone">{dados.count} agendamento(s)</div>
                              </div>
                              <div className="svc-price">R$ {dados.total.toFixed(2).replace(".", ",")}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <>
                  <p style={{fontSize:"13px",color:"#8B6E5A",marginBottom:"18px"}}>{sorted.length} agendamento(s)</p>
                  {sorted.length === 0 ? (
                    <div className="empty-st"><div style={{fontSize:"40px",marginBottom:"12px"}}>📅</div><p>Nenhum agendamento ainda.</p></div>
                  ) : sorted.map(b => (
                    <div key={b.id} className="admin-card">
                      <div className="admin-top">
                        <div>
                          <div className="admin-name">{b.name}</div>
                          <div className="admin-phone">{b.phone}</div>
                        </div>
                        <div className="admin-actions">
                          <a className="btn-wa-sm" href={getLinkSuelenParaCliente(b)} target="_blank" rel="noreferrer">
                            💬 Confirmar
                          </a>
                          <button className="del-btn" onClick={() => removeBooking(b.id)}>Cancelar</button>
                        </div>
                      </div>
                      <div className="admin-details">
                        <span>💅 {b.service}</span>
                        <span>📅 {getDayName(b.date)}, {formatDateBR(b.date)}</span>
                        <span>🕐 {formatTime(b.startMinutes)}–{formatTime(b.startMinutes + b.duration)}</span>
                        <span style={{color:"#C9956A",fontWeight:500}}>R$ {b.price},00</span>
                      </div>
                      <div style={{marginTop:"10px",display:"flex",alignItems:"center",gap:"8px"}}>
                        <button
                          className={`studio-toggle${b.isStudio ? " on" : ""}`}
                          onClick={() => toggleStudio(b)}
                        >
                          {b.isStudio ? "✓ Cliente do Studio (-40%)" : "Cliente direto (-30%)"}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // BOOKING VIEW
  if (view === "booking") {
    const calDays = step >= 2 ? getCalDays() : [];
    return (
      <div className="app">
        <style>{CSS}</style>
        <div className="header">
          <span className="logo">Suelen <span>Nail's</span> Designer</span>
          <div className="header-nav"><button onClick={() => { setView("home"); reset(); }}>← Início</button></div>
        </div>
        <div className="section">
          {step < 5 && (
            <div className="breadcrumb">
              {["Serviço","Data","Horário","Dados"].map((s,i) => (
                <span key={i} className={`bc${step === i+1 ? " active" : ""}`}>{s}</span>
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="sec-title">Escolha o serviço</div>
              <div className="divider"/>
              {SERVICES.map(s => (
                <div key={s.id} className={`service-card${sel.service?.id === s.id ? " sel" : ""}`} onClick={() => setSel(p => ({ ...p, service: s }))}>
                  <div className="svc-name">{s.name}</div>
                  <div className="svc-price">R$ {s.price}</div>
                </div>
              ))}
              <button className="btn btn-full" disabled={!sel.service} onClick={() => setStep(2)}>Continuar →</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <button className="back-btn" onClick={() => setStep(1)}>← Voltar</button>
              <div className="sec-title">Escolha a data</div>
              <div className="divider"/>
              <div className="calendar">
                <div className="cal-head">
                  <button className="cal-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}>‹</button>
                  <h3>{MONTHS_PT[month.getMonth()]} {month.getFullYear()}</h3>
                  <button className="cal-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}>›</button>
                </div>
                <div className="cal-body">
                  <div className="day-labels">{DAYS_PT.map(d => <div key={d} className="day-lbl">{d}</div>)}</div>
                  <div className="days">
                    {calDays.map((day, i) => {
                      if (!day) return <div key={i} className="dc"/>;
                      let cls = "dc";
                      if (day.closed || day.past) cls += " off";
                      else if (!day.hasSlots) cls += " no-slot";
                      else cls += " avail";
                      if (sel.date === day.dateStr) cls += " picked";
                      return <div key={i} className={cls} onClick={() => { if (!day.closed && !day.past && day.hasSlots) setSel(p => ({ ...p, date: day.dateStr, time: null })); }}>{day.d}</div>;
                    })}
                  </div>
                </div>
              </div>
              <p className="hint">Datas com numeração escura = horários disponíveis</p>
              <button className="btn btn-full" disabled={!sel.date} onClick={() => setStep(3)}>Continuar →</button>
            </div>
          )}

          {step === 3 && (
            <div>
              <button className="back-btn" onClick={() => setStep(2)}>← Voltar</button>
              <div className="sec-title">Escolha o horário</div>
              <div className="divider"/>
              <p style={{fontSize:"13px",color:"#8B6E5A",marginBottom:"16px"}}>{getDayName(sel.date)}, {formatDateBR(sel.date)}</p>
              {(() => {
                const slots = getSlots(sel.date);
                return slots.length === 0 ? (
                  <div className="empty-st"><p>Sem horários disponíveis nesta data.</p><br/><button className="btn-ghost" onClick={() => setStep(2)}>← Outra data</button></div>
                ) : (
                  <div className="slots">
                    {slots.map(t => <button key={t} className={`slot${sel.time === t ? " picked" : ""}`} onClick={() => setSel(p => ({ ...p, time: t }))}>{formatTime(t)}</button>)}
                  </div>
                );
              })()}
              <button className="btn btn-full" disabled={sel.time === null} onClick={() => setStep(4)}>Continuar →</button>
            </div>
          )}

          {step === 4 && (
            <div>
              <button className="back-btn" onClick={() => setStep(3)}>← Voltar</button>
              <div className="sec-title">Seus dados</div>
              <div className="divider"/>
              <div className="summary">
                <div className="sum-row"><span className="sum-lbl">Serviço</span><span className="sum-val">{sel.service.name}</span></div>
                <div className="sum-row"><span className="sum-lbl">Data</span><span className="sum-val">{getDayName(sel.date)}, {formatDateBR(sel.date)}</span></div>
                <div className="sum-row"><span className="sum-lbl">Horário</span><span className="sum-val">{formatTime(sel.time)} – {formatTime(sel.time + APPOINTMENT_BLOCK_MINUTES)}</span></div>
                <div className="sum-row"><span className="sum-lbl">Valor</span><span className="sum-price">R$ {sel.service.price},00</span></div>
              </div>
              <div className="form-group">
                <label className="form-label">Nome completo</label>
                <input className="form-input" type="text" placeholder="Seu nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input className="form-input" type="tel" placeholder="(21) 99999-9999" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <button className="btn btn-full" disabled={!form.name || !form.phone || submitting} onClick={submit}>
                {submitting ? "Salvando..." : "Confirmar agendamento"}
              </button>
            </div>
          )}

          {step === 5 && lastBooking && (
            <div className="confirm-wrap">
              <div className="confirm-icon">✓</div>
              <div className="sec-title" style={{textAlign:"center",marginBottom:"4px"}}>Agendado!</div>
              <p style={{color:"#8B6E5A",fontSize:"13px",marginBottom:"20px"}}>Até lá, {form.name.split(" ")[0]}! 💅</p>
              <div className="summary" style={{textAlign:"left"}}>
                <div className="sum-row"><span className="sum-lbl">Serviço</span><span className="sum-val">{sel.service.name}</span></div>
                <div className="sum-row"><span className="sum-lbl">Data</span><span className="sum-val">{getDayName(sel.date)}, {formatDateBR(sel.date)}</span></div>
                <div className="sum-row"><span className="sum-lbl">Horário</span><span className="sum-val">{formatTime(sel.time)} – {formatTime(sel.time + APPOINTMENT_BLOCK_MINUTES)}</span></div>
                <div className="sum-row"><span className="sum-lbl">Valor</span><span className="sum-price">R$ {sel.service.price},00</span></div>
              </div>
              <div className="confirm-actions">
                <a className="btn-wa" href={waLink(SUELEN_WHATSAPP, msgClienteParaSuelen(lastBooking))} target="_blank" rel="noreferrer">
                  💬 Confirmar pelo WhatsApp
                </a>
                <button className="btn-ghost" onClick={() => { reset(); setView("home"); }}>Voltar ao início</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // HOME VIEW
  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="header">
        <span className="logo">Suelen <span>Nail's</span> Designer</span>
        <div className="header-nav"><button onClick={() => setView("admin")}>Admin</button></div>
      </div>
      <div className="hero">
        <div className="hero-inner">
          <p className="eyebrow">Nail Designer · Rio de Janeiro</p>
          <h1 className="hero-title">Suelen<br/><em>Nail's Designer</em></h1>
          <p className="hero-sub">Ter–Sex 10h–20h · Sáb 10h–20h</p>
          <button className="btn" onClick={() => { setView("booking"); reset(); }}>Agendar horário</button>
        </div>
      </div>
    </div>
  );
}
