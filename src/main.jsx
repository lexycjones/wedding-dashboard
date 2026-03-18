import { useState, useMemo, useEffect, useCallback } from "react";

// ── SUPABASE CLIENT ──
// Loaded from CDN so this preview works without npm install.
// In your Vite deploy this is replaced by the npm import — see deploy guide.
const getSupabase = (() => {
  let client = null;
  let listeners = {};
  // In-memory mock used for preview (no real DB credentials here)
  const mock = (() => {
    let store = {};
    const notify = (t) => (listeners[t]||[]).forEach(fn=>fn());
    return {
      from: (table) => ({
        select: () => { const d=store[table]||null; return { data:d, error:null, then(r){r({data:d,error:null});return this;} }; },
        upsert: (row) => {
          if(!store[table])store[table]=[];
          (Array.isArray(row)?row:[row]).forEach(r=>{
            const i=store[table].findIndex(x=>x.id===r.id);
            if(i>=0)store[table][i]={...store[table][i],...r}; else store[table].push(r);
          });
          notify(table);
          return {then(r){r({error:null});return this;}};
        },
        update:(v)=>({eq:(c,val)=>{if(store[table]){const r=store[table].find(x=>x[c]===val);if(r)Object.assign(r,v);notify(table);}return{then(r){r({error:null});return this;}}; }}),
        delete:()=>({eq:(c,val)=>{if(store[table])store[table]=store[table].filter(x=>x[c]!==val);notify(table);return{then(r){r({error:null});return this;}}; }}),
      }),
      channel:(n)=>({on:()=>({on:()=>({subscribe:()=>({})}),subscribe:()=>({})}),subscribe:()=>({})}),
      _subscribe:(table,fn)=>{
        if(!listeners[table])listeners[table]=[];
        listeners[table].push(fn);
        return ()=>{listeners[table]=listeners[table].filter(f=>f!==fn);};
      }
    };
  })();
  return () => mock;
})();

const supabase = getSupabase();

// ── COLORS ──
const C = {
  bg:"#FFF8F5",bgAlt:"#FFF2EC",white:"#FFFFFF",
  pink:"#E8806A",pinkLight:"#F5C4B8",pinkPale:"#FDF0EB",
  pinkDeep:"#D4614A",orange:"#D4622A",orangeLight:"#F0A87A",
  orangePale:"#FDF4EE",coral:"#E8956A",text:"#2A1510",
  textMid:"#7A4535",textLight:"#B07060",border:"#F0C4B0",
  borderLight:"#FAE0D5",gold:"#C49A3C",goldLight:"#F5E5B0",
  teal:"#3A8070",tealLight:"#C0E0D8"
};

const GLOBAL_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;background:${C.bg};}
.pf{font-family:'Playfair Display',serif;}
.btn-primary{background:${C.pink};color:#fff;border:none;border-radius:6px;padding:8px 18px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;}
.btn-ghost{background:transparent;color:${C.orange};border:1.5px solid ${C.orange};border-radius:6px;padding:7px 16px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;}
.btn-ghost:hover{background:${C.orangePale};}
.btn-icon{background:transparent;border:none;cursor:pointer;font-size:18px;color:${C.textLight};}
input,select,textarea{font-family:'DM Sans',sans-serif;font-size:13px;}
::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-thumb{background:${C.pinkLight};border-radius:3px;}
.ticker-tile{background:#fff;border:1.5px solid ${C.border};border-radius:4px;width:44px;height:56px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
.ticker-tile::after{content:'';position:absolute;left:0;right:0;top:50%;height:1px;background:${C.borderLight};}
.tab-btn{background:transparent;border:none;cursor:pointer;padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:${C.pinkLight};border-bottom:2px solid transparent;pointer-events:auto !important;white-space:nowrap;}
.tab-btn.active{color:${C.orange};border-bottom-color:${C.orange};}
.tab-btn:hover{color:${C.orangeLight};}
.task-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;border-left:4px solid ${C.borderLight};margin-bottom:6px;background:#fff;transition:background 0.15s;}
.task-row:hover{background:${C.pinkPale};}
.pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;}
.card{background:#fff;border-radius:10px;border:1px solid ${C.borderLight};padding:18px;}
input[type=text],input[type=email],input[type=number],input[type=date],input[type=time],input[type=tel],input[type=url],select,textarea{border:1px solid ${C.border};border-radius:6px;padding:7px 10px;width:100%;background:#fff;color:${C.text};outline:none;}
input:focus,select:focus,textarea:focus{border-color:${C.pink};}
label{font-size:12px;font-weight:600;color:${C.textMid};margin-bottom:3px;display:block;}
`;

const TASK_TEMPLATES = [
  {id:"1",category:"Venue & Date",task:"Book wedding venue",monthsBefore:12,cost:5000,priority:"high",detailType:"venue"},
  {id:"2",category:"Venue & Date",task:"Book ceremony location",monthsBefore:12,cost:1000,priority:"high",detailType:"venue"},
  {id:"3",category:"Vendors",task:"Hire wedding planner",monthsBefore:12,cost:2000,priority:"high",detailType:"vendor"},
  {id:"4",category:"Vendors",task:"Book photographer",monthsBefore:11,cost:3000,priority:"high",detailType:"vendor"},
  {id:"5",category:"Vendors",task:"Book videographer",monthsBefore:11,cost:2000,priority:"medium",detailType:"vendor"},
  {id:"6",category:"Vendors",task:"Book caterer / choose menu",monthsBefore:10,cost:4000,priority:"high",detailType:"vendor"},
  {id:"7",category:"Vendors",task:"Book band or DJ",monthsBefore:10,cost:1500,priority:"medium",detailType:"vendor"},
  {id:"8",category:"Attire",task:"Purchase wedding dress",monthsBefore:10,cost:2000,priority:"high",detailType:"dress"},
  {id:"9",category:"Vendors",task:"Book florist",monthsBefore:9,cost:1500,priority:"medium",detailType:"vendor"},
  {id:"10",category:"Vendors",task:"Book hair & makeup artist",monthsBefore:9,cost:600,priority:"high",detailType:"vendor"},
  {id:"11",category:"Stationery",task:"Order save-the-dates",monthsBefore:9,cost:150,priority:"medium",detailType:"stationery"},
  {id:"12",category:"Vendors",task:"Book officiant",monthsBefore:8,cost:300,priority:"high",detailType:"vendor"},
  {id:"13",category:"Vendors",task:"Book wedding cake / bakery",monthsBefore:8,cost:600,priority:"medium",detailType:"vendor"},
  {id:"14",category:"Guests",task:"Build guest list",monthsBefore:10,cost:0,priority:"high",detailType:"guestlist"},
  {id:"15",category:"Attire",task:"First dress fitting",monthsBefore:6,cost:200,priority:"high",detailType:"fitting"},
  {id:"16",category:"Stationery",task:"Send wedding invitations",monthsBefore:6,cost:300,priority:"high",detailType:"stationery"},
  {id:"17",category:"Vendors",task:"Book rehearsal dinner venue",monthsBefore:6,cost:1000,priority:"medium",detailType:"vendor"},
  {id:"18",category:"Vendors",task:"Book transportation",monthsBefore:5,cost:700,priority:"medium",detailType:"vendor"},
  {id:"19",category:"Vendors",task:"Book honeymoon travel",monthsBefore:5,cost:0,priority:"medium",detailType:"vendor"},
  {id:"20",category:"Admin",task:"Get marriage license",monthsBefore:3,cost:75,priority:"high",detailType:"admin"},
  {id:"21",category:"Admin",task:"Finalize seating chart",monthsBefore:3,cost:0,priority:"medium",detailType:"seating"},
  {id:"22",category:"Attire",task:"Second dress fitting",monthsBefore:2,cost:150,priority:"high",detailType:"fitting"},
  {id:"23",category:"Vendors",task:"Hair & makeup trial run",monthsBefore:2,cost:100,priority:"high",detailType:"vendor"},
  {id:"24",category:"Attire",task:"Pick up wedding dress",monthsBefore:1,cost:0,priority:"high",detailType:"dress"},
  {id:"25",category:"Stationery",task:"Confirm guest final headcount",monthsBefore:1,cost:0,priority:"high",detailType:"stationery"},
  {id:"26",category:"Admin",task:"Confirm all vendors",monthsBefore:1,cost:0,priority:"high",detailType:"admin"},
  {id:"27",category:"Stationery",task:"Finalize ceremony music",monthsBefore:1,cost:0,priority:"medium",detailType:"stationery"},
  {id:"28",category:"Attire",task:"Final dress fitting",monthsBefore:0.5,cost:100,priority:"high",detailType:"fitting"},
  {id:"29",category:"Admin",task:"Prepare vendor payments & tips",monthsBefore:0.5,cost:0,priority:"high",detailType:"admin"},
  {id:"30",category:"Admin",task:"Wedding rehearsal",monthsBefore:0.1,cost:0,priority:"high",detailType:"admin"},
  {id:"31",category:"Admin",task:"Write vows",monthsBefore:1,cost:0,priority:"high",detailType:"vows"},
];

const DEFAULT_PACKING = ["Matching robes","Photo props","Bride sash & tiara","Party games","Playlist ready","Camera / disposables","Reservation confirmations","Transportation booked"];
const CAT_COLORS = {
  "Venue & Date":{bg:"#FDE8E0",text:C.pinkDeep},
  "Vendors":{bg:C.goldLight,text:"#8A6820"},
  "Attire":{bg:"#FAE0F0",text:"#A03060"},
  "Guests":{bg:C.tealLight,text:C.teal},
  "Stationery":{bg:C.orangePale,text:C.orange},
  "Admin":{bg:"#F0F0F0",text:"#606060"},
};

function calcDueDate(weddingDate, monthsBefore) {
  if (!weddingDate || monthsBefore == null) return null;
  return new Date(new Date(weddingDate).getTime() - monthsBefore * 30.44 * 86400000);
}
function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function fmtDate(d) { if (!d) return ""; return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
function daysUntil(d) { if (!d) return null; return Math.round((new Date(d).setHours(0,0,0,0) - today().getTime()) / 86400000); }

// ── SYNC HOOK ──
// In your real deploy this subscribes to Supabase Realtime.
// The mock just calls the loader when the in-memory store changes.
function useTable(table, loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase.from(table).select();
    if (!error) setData(rows);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    load();
    // Real Supabase realtime subscription — works as-is in deployed app:
    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, load)
      .subscribe();
    // Mock fallback:
    const unsub = supabase._subscribe ? supabase._subscribe(table, load) : () => {};
    return () => { unsub(); };
  }, [table, load]);

  return { data, loading, reload: load };
}

// ── PALM BACKGROUND ──
function PalmBg() {
  return (
    <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"hidden"}} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <polygon points="30,200 45,200 60,20 15,20" fill={C.orangeLight} opacity="0.18"/>
      <ellipse cx="30" cy="30" rx="55" ry="14" fill={C.orangeLight} opacity="0.18" transform="rotate(-30 30 30)"/>
      <ellipse cx="50" cy="25" rx="50" ry="12" fill={C.orangeLight} opacity="0.18" transform="rotate(20 50 25)"/>
      <ellipse cx="15" cy="35" rx="48" ry="11" fill={C.orangeLight} opacity="0.18" transform="rotate(-60 15 35)"/>
      <ellipse cx="60" cy="18" rx="45" ry="10" fill={C.orangeLight} opacity="0.18" transform="rotate(50 60 18)"/>
      <g transform="translate(820,0)">
        <polygon points="30,200 45,200 60,20 15,20" fill={C.orangeLight} opacity="0.18"/>
        <ellipse cx="30" cy="30" rx="55" ry="14" fill={C.orangeLight} opacity="0.18" transform="rotate(30 30 30)"/>
        <ellipse cx="10" cy="25" rx="50" ry="12" fill={C.orangeLight} opacity="0.18" transform="rotate(-20 10 25)"/>
        <ellipse cx="45" cy="35" rx="48" ry="11" fill={C.orangeLight} opacity="0.18" transform="rotate(60 45 35)"/>
      </g>
      <g transform="translate(90,10) scale(0.7)">
        <polygon points="30,200 40,200 50,40 20,40" fill={C.pink} opacity="0.12"/>
        <ellipse cx="30" cy="50" rx="42" ry="10" fill={C.pink} opacity="0.12" transform="rotate(-25 30 50)"/>
        <ellipse cx="45" cy="45" rx="38" ry="9" fill={C.pink} opacity="0.12" transform="rotate(35 45 45)"/>
      </g>
      <g transform="translate(720,10) scale(0.7)">
        <polygon points="30,200 40,200 50,40 20,40" fill={C.pink} opacity="0.12"/>
        <ellipse cx="30" cy="50" rx="42" ry="10" fill={C.pink} opacity="0.12" transform="rotate(25 30 50)"/>
        <ellipse cx="15" cy="45" rx="38" ry="9" fill={C.pink} opacity="0.12" transform="rotate(-35 15 45)"/>
      </g>
    </svg>
  );
}

function CountdownTicker({ weddingDate }) {
  const d = weddingDate ? daysUntil(new Date(weddingDate)) : null;
  if (d === null) return <div style={{textAlign:"center",color:C.textLight,fontSize:13}}>Set wedding date</div>;
  if (d === 0) return <div style={{textAlign:"center"}}><span className="pf" style={{fontSize:28,color:C.orange,fontWeight:900}}>Today! 🎉</span></div>;
  const num = Math.abs(d), label = d < 0 ? "days ago" : "days to go";
  const s = String(Math.min(num,999)).padStart(3,"0");
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{display:"flex",gap:6}}>
        {s.split("").map((digit,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div className="ticker-tile"><span className="pf" style={{fontSize:32,fontWeight:900,color:C.orange,zIndex:1,position:"relative"}}>{digit}</span></div>
            <span style={{fontSize:8,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:C.textLight}}>{["hundreds","tens","ones"][i]}</span>
          </div>
        ))}
      </div>
      <span style={{fontSize:11,color:C.textLight,fontWeight:500}}>{label}</span>
    </div>
  );
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{borderTop:`3px solid ${accent}`}}>
      <div style={{fontSize:11,fontWeight:600,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>
      <div className="pf" style={{fontSize:28,fontWeight:900,color:accent,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:12,color:C.textLight,marginTop:4}}>{sub}</div>}
    </div>
  );
}

// ── LOADING SPINNER ──
function Spinner() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16}}>
      <div style={{width:40,height:40,border:`3px solid ${C.borderLight}`,borderTop:`3px solid ${C.orange}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{color:C.textLight,fontSize:13}}>Loading your wedding dashboard…</div>
    </div>
  );
}

// ── SETUP SCREEN ──
function SetupScreen({ onComplete }) {
  const [bride, setBride] = useState("");
  const [partner, setPartner] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState(25000);
  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,#FFF4F0 0%,#FFF8F5 60%,#FDF0E8 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-60,right:-60,width:320,height:320,borderRadius:"50%",background:`radial-gradient(circle,${C.pinkLight}55,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-80,left:-40,width:280,height:280,borderRadius:"50%",background:`radial-gradient(circle,${C.orangeLight}40,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${C.pinkLight},${C.orangeLight})`,marginBottom:14,fontSize:26}}>💍</div>
          <div className="pf" style={{fontSize:36,fontWeight:900,color:C.text,lineHeight:1}}>Wedding Planner</div>
          <div style={{fontSize:13,color:C.textLight,marginTop:6}}>Your perfect day starts here</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.85)",backdropFilter:"blur(12px)",borderRadius:20,border:`1px solid ${C.borderLight}`,boxShadow:"0 8px 48px rgba(212,98,42,0.10)",padding:32}}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label>Your name</label><input type="text" value={bride} onChange={e=>setBride(e.target.value)} placeholder="e.g. Sophia"/></div>
              <div><label>Partner's name</label><input type="text" value={partner} onChange={e=>setPartner(e.target.value)} placeholder="e.g. James"/></div>
            </div>
            <div><label>Wedding date <span style={{color:C.orange}}>*</span></label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <div><label>Total budget</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textLight,fontSize:13,fontWeight:600}}>$</span>
                <input type="number" value={budget} onChange={e=>setBudget(Number(e.target.value))} style={{paddingLeft:22}}/>
              </div>
            </div>
            <button className="btn-primary" disabled={!date} onClick={()=>onComplete({bride,partner,date,budget})}
              style={{marginTop:4,padding:"14px 0",fontSize:15,borderRadius:10,background:date?`linear-gradient(135deg,${C.pink},${C.orange})`:"#ddd",fontWeight:700,boxShadow:date?"0 4px 16px rgba(212,98,42,0.30)":"none",transition:"all 0.2s"}}>
              Begin planning ✨
            </button>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:C.textLight}}>No account needed · Data syncs in real time</div>
      </div>
    </div>
  );
}

// ── DETAIL MODAL ──
function DetailModal({ task, onSave, onClose }) {
  const [details, setDetails] = useState(task.details || {});
  const upd = (k,v) => setDetails(p=>({...p,[k]:v}));
  const [appts, setAppts] = useState(details.appointments||[]);
  const [newAppt, setNewAppt] = useState({date:"",time:"",location:"",notes:""});
  const [links, setLinks] = useState(details.links||[]);
  const [newLink, setNewLink] = useState({label:"",url:""});
  const [guests, setGuests] = useState(details.guests||[]);
  const [newGuest, setNewGuest] = useState({name:"",email:"",phone:"",rsvp:"pending",dietary:"",table:""});
  const dt = task.detailType;
  const hasAppts = ["dress","fitting","vendor","venue"].includes(dt);

  const fld = (label,key,type="text",opts=null) => (
    <div style={{marginBottom:12}}>
      <label>{label}</label>
      {type==="select"?<select value={details[key]||""} onChange={e=>upd(key,e.target.value)}><option value="">Select…</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
      :type==="textarea"?<textarea rows={3} value={details[key]||""} onChange={e=>upd(key,e.target.value)} style={{resize:"vertical"}}/>
      :<input type={type} value={details[key]||""} onChange={e=>upd(key,e.target.value)}/>}
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(42,21,16,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 16px 60px rgba(0,0,0,0.22)"}}>
        <div style={{background:`linear-gradient(135deg,${C.pink},${C.orange})`,padding:"20px 24px",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div className="pf" style={{fontSize:20,fontWeight:700,color:"#fff"}}>{task.task}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:24}}>
          <div style={{marginBottom:16}}><label>Notes & reminders</label><textarea rows={2} value={details.notes||""} onChange={e=>upd("notes",e.target.value)} placeholder="Any notes…" style={{resize:"vertical"}}/></div>
          {(dt==="dress"||dt==="fitting")&&<>{fld("Designer / boutique","designer")}{fld("Style / SKU","style")}{fld("Size ordered","size")}{fld("Total paid ($)","totalPaid","number")}{fld("Alterations needed","alterations","textarea")}</>}
          {dt==="vendor"&&<>{fld("Vendor name","vendorName")}{fld("Contact person","contact")}{fld("Phone","phone","tel")}{fld("Email","email","email")}{fld("Contract signed","contractSigned","select",["No","Yes","Pending"])}{fld("Deposit paid ($)","deposit","number")}{fld("Package / services","package","textarea")}</>}
          {dt==="venue"&&<>{fld("Venue name","venueName")}{fld("Capacity","capacity","number")}{fld("Address","address")}{fld("Contact","contact")}{fld("Rental cost ($)","rentalCost","number")}{fld("Catering included","catering","select",["Yes","No"])}{fld("Parking","parking","select",["No","Yes","Valet"])}</>}
          {dt==="guestlist"&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr auto",gap:6,marginBottom:8}}>
              {["Name","Email","Phone","RSVP","Dietary","Table",""].map((h,i)=><div key={i} style={{fontSize:11,fontWeight:700,color:C.textMid}}>{h}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr auto",gap:6,marginBottom:8}}>
              <input type="text" placeholder="Name" value={newGuest.name} onChange={e=>setNewGuest(p=>({...p,name:e.target.value}))}/>
              <input type="email" placeholder="Email" value={newGuest.email} onChange={e=>setNewGuest(p=>({...p,email:e.target.value}))}/>
              <input type="tel" placeholder="Phone" value={newGuest.phone} onChange={e=>setNewGuest(p=>({...p,phone:e.target.value}))}/>
              <select value={newGuest.rsvp} onChange={e=>setNewGuest(p=>({...p,rsvp:e.target.value}))}><option value="pending">Pending</option><option value="yes">Yes</option><option value="no">No</option></select>
              <input type="text" placeholder="Dietary" value={newGuest.dietary} onChange={e=>setNewGuest(p=>({...p,dietary:e.target.value}))}/>
              <input type="text" placeholder="Table #" value={newGuest.table} onChange={e=>setNewGuest(p=>({...p,table:e.target.value}))}/>
              <button className="btn-primary" style={{padding:"4px 10px",fontSize:12}} onClick={()=>{if(newGuest.name){setGuests(p=>[...p,{...newGuest,id:Date.now()}]);setNewGuest({name:"",email:"",phone:"",rsvp:"pending",dietary:"",table:""});}}}>+</button>
            </div>
            <div style={{maxHeight:160,overflowY:"auto"}}>
              {guests.map((g,i)=>(
                <div key={g.id||i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr auto",gap:6,marginBottom:4,alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.borderLight}`}}>
                  <span style={{fontSize:12}}>{g.name}</span><span style={{fontSize:11,color:C.textLight}}>{g.email}</span>
                  <span style={{fontSize:11,color:C.textLight}}>{g.phone}</span>
                  <span className="pill" style={{background:g.rsvp==="yes"?C.tealLight:g.rsvp==="no"?"#FFE0E0":C.goldLight,color:g.rsvp==="yes"?C.teal:g.rsvp==="no"?"#C04040":C.gold,fontSize:10}}>{g.rsvp}</span>
                  <span style={{fontSize:11}}>{g.dietary}</span><span style={{fontSize:11}}>{g.table}</span>
                  <button className="btn-icon" style={{fontSize:14}} onClick={()=>setGuests(p=>p.filter((_,j)=>j!==i))}>×</button>
                </div>
              ))}
            </div>
            {guests.length>0&&<div style={{marginTop:8,fontSize:12,color:C.textMid}}>✓ {guests.filter(g=>g.rsvp==="yes").length} confirmed · ✗ {guests.filter(g=>g.rsvp==="no").length} declined · ⏳ {guests.filter(g=>g.rsvp==="pending").length} pending</div>}
          </>}
          {dt==="seating"&&<>{fld("Number of tables","numTables","number")}{fld("Seats per table","seatsPerTable","number")}{fld("Special arrangements","special","textarea")}</>}
          {dt==="vows"&&<><label>Your vows</label><textarea rows={8} value={details.vows||""} onChange={e=>upd("vows",e.target.value)} placeholder="Write your vows here…" style={{resize:"vertical",marginBottom:12}}/></>}
          {dt==="stationery"&&<>{fld("Quantity","quantity","number")}{fld("Printer / designer","printer")}{fld("Order date","orderDate","date")}{fld("Expected delivery","deliveryDate","date")}</>}
          {hasAppts&&<div style={{borderTop:`1px solid ${C.borderLight}`,marginTop:16,paddingTop:16}}>
            <div style={{fontWeight:700,color:C.textMid,fontSize:13,marginBottom:10}}>📅 Appointments</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:6,marginBottom:8}}>
              <input type="date" value={newAppt.date} onChange={e=>setNewAppt(p=>({...p,date:e.target.value}))}/>
              <input type="time" value={newAppt.time} onChange={e=>setNewAppt(p=>({...p,time:e.target.value}))}/>
              <input type="text" placeholder="Location" value={newAppt.location} onChange={e=>setNewAppt(p=>({...p,location:e.target.value}))}/>
              <input type="text" placeholder="Notes" value={newAppt.notes} onChange={e=>setNewAppt(p=>({...p,notes:e.target.value}))}/>
              <button className="btn-primary" style={{padding:"4px 10px"}} onClick={()=>{if(newAppt.date||newAppt.time){setAppts(p=>[...p,{...newAppt,id:Date.now()}]);setNewAppt({date:"",time:"",location:"",notes:""});}}}>+</button>
            </div>
            {appts.map((a,i)=>(
              <div key={a.id||i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:12}}>
                <span style={{color:C.orange,fontWeight:600}}>{a.date}</span><span>{a.time}</span><span style={{color:C.textMid}}>{a.location}</span><span style={{color:C.textLight}}>{a.notes}</span>
                <button className="btn-icon" style={{marginLeft:"auto",fontSize:14}} onClick={()=>setAppts(p=>p.filter((_,j)=>j!==i))}>×</button>
              </div>
            ))}
          </div>}
          <div style={{borderTop:`1px solid ${C.borderLight}`,marginTop:16,paddingTop:16}}>
            <div style={{fontWeight:700,color:C.textMid,fontSize:13,marginBottom:10}}>🔗 Inspiration & links</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr auto",gap:6,marginBottom:8}}>
              <input type="text" placeholder="Label" value={newLink.label} onChange={e=>setNewLink(p=>({...p,label:e.target.value}))}/>
              <input type="url" placeholder="https://…" value={newLink.url} onChange={e=>setNewLink(p=>({...p,url:e.target.value}))}/>
              <button className="btn-primary" style={{padding:"4px 10px"}} onClick={()=>{if(newLink.url){setLinks(p=>[...p,{...newLink,id:Date.now()}]);setNewLink({label:"",url:""});}}}>+</button>
            </div>
            {links.map((l,i)=>(
              <div key={l.id||i} style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",fontSize:12}}>
                <a href={l.url} target="_blank" rel="noreferrer" style={{color:C.pink,fontWeight:600}}>{l.label||l.url}</a>
                <button className="btn-icon" style={{marginLeft:"auto",fontSize:14}} onClick={()=>setLinks(p=>p.filter((_,j)=>j!==i))}>×</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24}}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={()=>onSave({...details,appointments:appts,links,guests,notes:details.notes||""})}>Save details</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EDIT CONFIG MODAL ──
function EditModal({ config, onSave, onClose }) {
  const [b,setB]=useState(config.bride_name||"");
  const [p,setP]=useState(config.partner_name||"");
  const [d,setD]=useState(config.wedding_date||"");
  const [bu,setBu]=useState(config.budget||25000);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(42,21,16,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}}>
      <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:420,padding:28,boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
        <div className="pf" style={{fontSize:20,fontWeight:700,color:C.pinkDeep,marginBottom:20}}>Edit wedding details</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div><label>Your name</label><input type="text" value={b} onChange={e=>setB(e.target.value)}/></div>
          <div><label>Partner's name</label><input type="text" value={p} onChange={e=>setP(e.target.value)}/></div>
          <div><label>Wedding date</label><input type="date" value={d} onChange={e=>setD(e.target.value)}/></div>
          <div><label>Total budget ($)</label><input type="number" value={bu} onChange={e=>setBu(Number(e.target.value))}/></div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=>onSave({bride_name:b,partner_name:p,wedding_date:d,budget:bu})}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── TAB: TIMELINE ──
function TabTimeline({ tasks, onToggle, onDetails, onAddTask }) {
  const [filter,setFilter]=useState("All");
  const [showAdd,setShowAdd]=useState(false);
  const [newTask,setNewTask]=useState({task:"",category:"Vendors",dueDate:"",cost:"",priority:"medium",notes:""});
  const cats=["All",...Array.from(new Set(TASK_TEMPLATES.map(t=>t.category)))];
  const t0=today();

  const handleAdd=()=>{
    if(!newTask.task.trim())return;
    onAddTask({...newTask,cost:Number(newTask.cost)||0,dueDate:newTask.dueDate?new Date(newTask.dueDate):null});
    setNewTask({task:"",category:"Vendors",dueDate:"",cost:"",priority:"medium",notes:""});
    setShowAdd(false);
  };

  const filtered=useMemo(()=>{
    const list=filter==="All"?tasks:tasks.filter(t=>t.category===filter);
    return [...list].sort((a,b)=>new Date(a.due_date||a.dueDate)-new Date(b.due_date||b.dueDate));
  },[tasks,filter]);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setFilter(c)} style={{padding:"5px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,background:filter===c?C.pink:"#fff",color:filter===c?"#fff":C.textMid,border:`1px solid ${filter===c?C.pink:C.border}`}}>{c}</button>
          ))}
        </div>
        <button className="btn-primary" style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",borderRadius:20}} onClick={()=>setShowAdd(p=>!p)}>
          <span style={{fontSize:16,lineHeight:1}}>+</span> Add task
        </button>
      </div>
      {showAdd&&(
        <div style={{background:"#fff",border:`1.5px solid ${C.pinkLight}`,borderRadius:12,padding:18,marginBottom:16,boxShadow:`0 4px 20px rgba(232,128,106,0.10)`}}>
          <div className="pf" style={{fontSize:15,fontWeight:700,color:C.pinkDeep,marginBottom:14}}>New custom task</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label>Task name <span style={{color:C.orange}}>*</span></label><input type="text" value={newTask.task} onChange={e=>setNewTask(p=>({...p,task:e.target.value}))} placeholder="e.g. Book rehearsal brunch" autoFocus/></div>
            <div><label>Category</label><select value={newTask.category} onChange={e=>setNewTask(p=>({...p,category:e.target.value}))}>{cats.filter(c=>c!=="All").map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label>Due date</label><input type="date" value={newTask.dueDate} onChange={e=>setNewTask(p=>({...p,dueDate:e.target.value}))}/></div>
            <div><label>Priority</label><select value={newTask.priority} onChange={e=>setNewTask(p=>({...p,priority:e.target.value}))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 3fr",gap:10,marginBottom:14}}>
            <div><label>Est. cost ($)</label><div style={{position:"relative"}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textLight,fontSize:13}}>$</span><input type="number" value={newTask.cost} onChange={e=>setNewTask(p=>({...p,cost:e.target.value}))} style={{paddingLeft:20}} placeholder="0"/></div></div>
            <div><label>Notes</label><input type="text" value={newTask.notes} onChange={e=>setNewTask(p=>({...p,notes:e.target.value}))} placeholder="Optional notes…"/></div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAdd} disabled={!newTask.task.trim()} style={{opacity:newTask.task.trim()?1:0.5}}>Add to timeline</button>
          </div>
        </div>
      )}
      {filtered.map(task=>{
        const d=task.due_date||task.dueDate;
        const diff=d?Math.round((new Date(d).setHours(0,0,0,0)-t0.getTime())/86400000):null;
        const overdue=diff!==null&&diff<0&&!task.done;
        const borderColor=task.done?C.teal:overdue?C.orange:task.priority==="high"?C.pink:C.borderLight;
        const cc=CAT_COLORS[task.category]||{bg:"#eee",text:"#666"};
        const hasDetails=task.details&&Object.keys(task.details).some(k=>task.details[k]&&task.details[k]!=="");
        return (
          <div key={task.id} className="task-row" style={{borderLeftColor:borderColor,opacity:task.done?0.65:1}}>
            <input type="checkbox" checked={!!task.done} onChange={()=>onToggle(task.id,!task.done)} style={{accentColor:C.pink,width:16,height:16,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:task.done?C.textLight:C.text,textDecoration:task.done?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{task.task}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4,alignItems:"center"}}>
                {task.details?.vendorName&&<span style={{fontSize:11,color:C.textMid}}>📋 {task.details.vendorName}</span>}
                {task.details?.appointments?.length>0&&<span style={{fontSize:11,color:C.gold}}>📅 {task.details.appointments.length} appt{task.details.appointments.length>1?"s":""}</span>}
              </div>
            </div>
            {d&&<div style={{fontSize:11,fontWeight:600,color:overdue?C.orange:diff===0?C.teal:diff<=7&&diff>0?C.pinkDeep:C.textLight,whiteSpace:"nowrap"}}>
              {overdue?`${Math.abs(diff)}d overdue`:diff===0?"Due today":diff<=7?`${diff}d left`:fmtDate(d)}
            </div>}
            {task.cost>0&&<span className="pill" style={{background:C.goldLight,color:"#8A6820",fontSize:10}}>${task.cost.toLocaleString()}</span>}
            <span className="pill" style={{background:cc.bg,color:cc.text}}>{task.category}</span>
            {hasDetails&&<span className="pill" style={{background:C.goldLight,color:C.gold,fontSize:10}}>details added</span>}
            {task.custom&&<span className="pill" style={{background:"#EEF0FF",color:"#5060C0",fontSize:10}}>custom</span>}
            <button className="btn-ghost" style={{padding:"4px 10px",fontSize:11,whiteSpace:"nowrap"}} onClick={()=>onDetails(task)}>{hasDetails?"Edit":"Details"}</button>
          </div>
        );
      })}
    </div>
  );
}

// ── TAB: CALENDAR ──
function TabCalendar({ tasks, weddingDate }) {
  const today_=today();
  const [cur,setCur]=useState(()=>{const d=weddingDate?new Date(weddingDate):new Date();return{year:d.getFullYear(),month:d.getMonth()};});
  const {year,month}=cur;
  const first=new Date(year,month,1),last=new Date(year,month+1,0);
  const cells=[];
  for(let i=0;i<first.getDay();i++)cells.push(null);
  for(let d=1;d<=last.getDate();d++)cells.push(d);
  const tasksByDay=useMemo(()=>{
    const map={};
    tasks.forEach(t=>{
      const dd=t.due_date||t.dueDate;
      if(!dd)return;
      const d=new Date(dd);
      if(d.getFullYear()===year&&d.getMonth()===month){const k=d.getDate();if(!map[k])map[k]=[];map[k].push(t);}
    });
    if(weddingDate){const wd=new Date(weddingDate);if(wd.getFullYear()===year&&wd.getMonth()===month){const k=wd.getDate();if(!map[k])map[k]=[];if(!map[k].find(t=>t.id==="wedding_day"))map[k].unshift({id:"wedding_day",task:"💒 Wedding Day!",done:false,isWedding:true});}}
    return map;
  },[tasks,year,month,weddingDate]);
  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
        <button className="btn-ghost" style={{padding:"4px 12px"}} onClick={()=>setCur(p=>{const d=new Date(p.year,p.month-1);return{year:d.getFullYear(),month:d.getMonth()};})}>‹</button>
        <div className="pf" style={{fontSize:20,fontWeight:700,color:C.pinkDeep,flex:1,textAlign:"center"}}>{first.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
        <button className="btn-ghost" style={{padding:"4px 12px"}} onClick={()=>setCur(p=>{const d=new Date(p.year,p.month+1);return{year:d.getFullYear(),month:d.getMonth()};})}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:C.border,borderRadius:8,overflow:"hidden"}}>
        {DAYS.map(d=><div key={d} style={{background:C.pinkPale,textAlign:"center",padding:"8px 0",fontSize:11,fontWeight:700,color:C.textMid,textTransform:"uppercase"}}>{d}</div>)}
        {cells.map((d,i)=>{
          const isToday=d&&new Date(year,month,d).setHours(0,0,0,0)===today_.getTime();
          const dayTasks=d?(tasksByDay[d]||[]):[];
          const shown=dayTasks.slice(0,3),extra=dayTasks.length-3;
          return(
            <div key={i} style={{background:"#fff",minHeight:70,padding:4}}>
              {d&&<div style={{width:22,height:22,borderRadius:"50%",background:isToday?C.orangePale:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:isToday?700:400,color:isToday?C.orange:C.textLight,marginBottom:2}}>{d}</div>}
              {shown.map((t,j)=>{
                const ov=!t.done&&t.dueDate&&new Date(t.dueDate).setHours(0,0,0,0)<today_.getTime();
                const bg=t.isWedding?C.pink:t.done?C.tealLight:ov?C.pinkLight:C.goldLight;
                const tc=t.isWedding?"#fff":t.done?C.teal:ov?C.pinkDeep:"#8A6820";
                return<div key={j} style={{background:bg,color:tc,fontSize:9,padding:"1px 4px",borderRadius:3,marginBottom:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",fontWeight:t.isWedding?700:400}}>{t.task}</div>;
              })}
              {extra>0&&<div style={{fontSize:9,color:C.textLight}}>+{extra} more</div>}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
        {[["Wedding Day",C.pink,"#fff"],["Done",C.tealLight,C.teal],["Overdue",C.pinkLight,C.pinkDeep],["Upcoming",C.goldLight,"#8A6820"]].map(([l,bg])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11}}><div style={{width:12,height:12,borderRadius:2,background:bg}}/><span style={{color:C.textLight}}>{l}</span></div>
        ))}
      </div>
    </div>
  );
}

// ── TAB: BUDGET ──
function TabBudget({ budget, budgetItems, onUpdateActual }) {
  const estimated=budgetItems.reduce((s,i)=>s+(i.estimated||0),0);
  const actual=budgetItems.reduce((s,i)=>s+(i.actual||0),0);
  const remaining=budget-actual;
  const pct=Math.min(100,Math.round(actual/budget*100));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:20}}>
        <MetricCard label="Total budget" value={`$${budget.toLocaleString()}`} accent={C.pink}/>
        <MetricCard label="Estimated" value={`$${estimated.toLocaleString()}`} accent={C.gold}/>
        <MetricCard label="Actual spend" value={`$${actual.toLocaleString()}`} accent={C.orange}/>
        <MetricCard label="Remaining" value={`$${remaining.toLocaleString()}`} accent={remaining<0?C.orange:C.teal}/>
      </div>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textLight,marginBottom:4}}><span>Budget used</span><span>{pct}%</span></div>
        <div style={{height:8,background:C.borderLight,borderRadius:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:actual>budget?C.orange:C.pink,borderRadius:4,transition:"width 0.4s"}}/></div>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 60px"}}>
          {["Item","Estimated","Actual",""].map((h,i)=><div key={i} style={{padding:"10px 14px",background:C.pinkPale,fontSize:11,fontWeight:700,color:C.textMid,textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:`1px solid ${C.borderLight}`}}>{h}</div>)}
          {budgetItems.map(item=><>
            <div key={item.id+"n"} style={{padding:"10px 14px",borderBottom:`1px solid ${C.borderLight}`,fontSize:13}}>{item.name}</div>
            <div key={item.id+"e"} style={{padding:"10px 14px",borderBottom:`1px solid ${C.borderLight}`,fontSize:13,color:C.textMid}}>${(item.estimated||0).toLocaleString()}</div>
            <div key={item.id+"a"} style={{padding:"10px 14px",borderBottom:`1px solid ${C.borderLight}`}}>
              <input type="number" value={item.actual||0} onChange={e=>onUpdateActual(item.id,Number(e.target.value))} style={{width:"100%",border:"none",background:"transparent",fontSize:13,color:(item.actual||0)>(item.estimated||0)?C.orange:(item.actual||0)>0?C.teal:C.textLight,padding:0,outline:"none"}}/>
            </div>
            <div key={item.id+"x"} style={{padding:"10px 14px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {(item.actual||0)>0&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:10,background:(item.actual||0)>(item.estimated||0)?"#FFE0D5":"#E0F5F0",color:(item.actual||0)>(item.estimated||0)?C.orange:C.teal,fontWeight:700}}>{(item.actual||0)>(item.estimated||0)?"over":"paid"}</span>}
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

// ── TAB: VENDORS ──
function TabVendors({ tasks, onToggle, onDetails }) {
  const vendors=tasks.filter(t=>t.category==="Vendors");
  const t0=today();
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {vendors.map(task=>{
        const d=task.due_date||task.dueDate;
        const diff=d?Math.round((new Date(d).setHours(0,0,0,0)-t0.getTime())/86400000):null;
        const overdue=diff!==null&&diff<0&&!task.done;
        const name=task.details?.vendorName||task.task;
        const initials=name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
        let statusBg,statusC,statusLabel;
        if(task.done){statusBg=C.tealLight;statusC=C.teal;statusLabel="Booked";}
        else if(overdue){statusBg=C.pinkLight;statusC=C.pinkDeep;statusLabel="Overdue";}
        else if(diff!==null&&diff<=90){statusBg=C.goldLight;statusC="#8A6820";statusLabel="Book soon";}
        else{statusBg="#F0F0F0";statusC="#808080";statusLabel="Pending";}
        return (
          <div key={task.id} className="card" style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:C.pinkPale,color:C.pink,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>{name}</div>
              <div style={{fontSize:11,color:C.textLight,display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}>
                {task.details?.contact&&<span>👤 {task.details.contact}</span>}
                {task.details?.phone&&<span>📞 {task.details.phone}</span>}
                {task.details?.email&&<span>✉️ {task.details.email}</span>}
                {d&&<span>📅 {fmtDate(d)}</span>}
              </div>
            </div>
            <span className="pill" style={{background:statusBg,color:statusC}}>{statusLabel}</span>
            {task.cost>0&&<span style={{fontSize:12,color:C.textLight}}>${task.cost.toLocaleString()}</span>}
            <input type="checkbox" checked={!!task.done} onChange={()=>onToggle(task.id,!task.done)} style={{accentColor:C.teal,width:16,height:16}}/>
            <button className="btn-ghost" style={{padding:"5px 12px",fontSize:11}} onClick={()=>onDetails(task)}>{task.details?.vendorName?"Edit":"Add info"}</button>
          </div>
        );
      })}
    </div>
  );
}

// ── TAB: VISION ──
function TabVision({ wishlist, onUpdate }) {
  const [inputs,setInputs]=useState({must:"",nice:"",not:""});
  const cols=[
    {key:"must_haves",label:"Must haves",icon:"★",bg:"#FDF0F5",border:"#F0C0D0",tagBg:C.pinkLight,tagC:C.pinkDeep},
    {key:"nice_to_haves",label:"Nice to haves",icon:"◆",bg:C.orangePale,border:C.borderLight,tagBg:C.goldLight,tagC:"#8A6820"},
    {key:"absolutely_not",label:"Absolutely not",icon:"✕",bg:"#FFF5F5",border:"#F0A8A8",tagBg:"#FFDDDD",tagC:"#C04040"},
  ];
  const inputKey={must_haves:"must",nice_to_haves:"nice",absolutely_not:"not"};
  const add=(key)=>{
    const ik=inputKey[key],v=inputs[ik].trim();
    if(!v)return;
    onUpdate({...wishlist,[key]:[...(wishlist[key]||[]),v]});
    setInputs(p=>({...p,[ik]:""}));
  };
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
      {cols.map(col=>(
        <div key={col.key} style={{background:col.bg,border:`1.5px solid ${col.border}`,borderRadius:12,padding:18}}>
          <div style={{fontSize:18,marginBottom:4}}>{col.icon} <span className="pf" style={{fontSize:16,fontWeight:700,color:C.text}}>{col.label}</span></div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <input type="text" placeholder="Add item…" value={inputs[inputKey[col.key]]} onChange={e=>setInputs(p=>({...p,[inputKey[col.key]]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add(col.key)} style={{flex:1,background:"rgba(255,255,255,0.7)"}}/>
            <button className="btn-primary" style={{padding:"4px 10px"}} onClick={()=>add(col.key)}>+</button>
          </div>
          {!(wishlist[col.key]||[]).length&&<div style={{fontSize:12,color:C.textLight,fontStyle:"italic"}}>Nothing here yet</div>}
          {(wishlist[col.key]||[]).map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:col.tagBg,color:col.tagC,borderRadius:6,padding:"5px 10px",marginBottom:6,fontSize:12,fontWeight:500}}>
              <span style={{flex:1}}>{item}</span>
              <button style={{background:"none",border:"none",cursor:"pointer",color:col.tagC,fontSize:14,lineHeight:1}} onClick={()=>onUpdate({...wishlist,[col.key]:(wishlist[col.key]||[]).filter((_,j)=>j!==i)})}>×</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── TAB: BACHELORETTE ──
function TabBachelorette({ bach, onUpdate }) {
  const upd=(k,v)=>onUpdate({...bach,[k]:v});
  const [newGuest,setNewGuest]=useState({name:"",email:"",phone:"",rsvp:"pending",paid:false});
  const [newIdea,setNewIdea]=useState("");
  const [newPack,setNewPack]=useState("");
  const squad=bach.squad||[];
  const ideas=bach.ideas||[];
  const packing=bach.packing||DEFAULT_PACKING.map((t,i)=>({id:i,text:t,checked:false}));
  const packed=packing.filter(p=>p.checked).length;

  const addGuest=()=>{if(newGuest.name){upd("squad",[...squad,{...newGuest,id:Date.now()}]);setNewGuest({name:"",email:"",phone:"",rsvp:"pending",paid:false});}};
  const addIdea=()=>{if(newIdea.trim()){upd("ideas",[...ideas,newIdea.trim()]);setNewIdea("");}};
  const addPack=()=>{if(newPack.trim()){upd("packing",[...packing,{id:Date.now(),text:newPack.trim(),checked:false}]);setNewPack("");}};
  const togPack=(id)=>upd("packing",packing.map(p=>p.id===id?{...p,checked:!p.checked}:p));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div className="card">
        <div style={{fontWeight:700,fontSize:15,color:C.pinkDeep,marginBottom:14}} className="pf">🥂 Event Details</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label>Date</label><input type="date" value={bach.event_date||""} onChange={e=>upd("event_date",e.target.value)}/></div>
          <div><label>Destination / Location</label><input type="text" value={bach.destination||""} onChange={e=>upd("destination",e.target.value)} placeholder="e.g. Miami, FL"/></div>
          <div style={{gridColumn:"1/-1"}}><label>Notes & theme</label><textarea rows={3} value={bach.theme||""} onChange={e=>upd("theme",e.target.value)} placeholder="Tropical vibes, hot pink dress code…" style={{resize:"vertical"}}/></div>
        </div>
      </div>
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:15,color:C.pinkDeep}} className="pf">👯 The Squad</div>
          <div style={{fontSize:12,color:C.textLight}}>{squad.filter(g=>g.paid).length}/{squad.length} confirmed · {squad.filter(g=>g.rsvp==="coming").length} attending</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 1fr 1fr auto",gap:6,marginBottom:8}}>
          <input type="text" placeholder="Name" value={newGuest.name} onChange={e=>setNewGuest(p=>({...p,name:e.target.value}))}/>
          <input type="email" placeholder="Email" value={newGuest.email} onChange={e=>setNewGuest(p=>({...p,email:e.target.value}))}/>
          <input type="tel" placeholder="Phone" value={newGuest.phone} onChange={e=>setNewGuest(p=>({...p,phone:e.target.value}))}/>
          <select value={newGuest.rsvp} onChange={e=>setNewGuest(p=>({...p,rsvp:e.target.value}))}><option value="pending">Pending</option><option value="coming">Coming</option><option value="can't make it">Can't make it</option></select>
          <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.textMid,margin:0}}><input type="checkbox" checked={newGuest.paid} onChange={e=>setNewGuest(p=>({...p,paid:e.target.checked}))} style={{accentColor:C.pink}}/>Paid</label>
          <button className="btn-primary" style={{padding:"4px 10px"}} onClick={addGuest}>+</button>
        </div>
        {squad.map((g,i)=>(
          <div key={g.id||i} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 1fr 1fr auto",gap:6,padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`,alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:600}}>{g.name}</span>
            <span style={{fontSize:11,color:C.textLight}}>{g.email}</span>
            <span style={{fontSize:11,color:C.textLight}}>{g.phone}</span>
            <span className="pill" style={{background:g.rsvp==="coming"?C.tealLight:g.rsvp==="can't make it"?"#FFE0E0":C.goldLight,color:g.rsvp==="coming"?C.teal:g.rsvp==="can't make it"?"#C04040":"#8A6820",fontSize:10}}>{g.rsvp}</span>
            <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,margin:0}}><input type="checkbox" checked={g.paid} onChange={()=>upd("squad",squad.map((s,j)=>j===i?{...s,paid:!s.paid}:s))} style={{accentColor:C.teal}}/><span style={{color:C.textMid}}>Paid</span></label>
            <button className="btn-icon" style={{fontSize:14}} onClick={()=>upd("squad",squad.filter((_,j)=>j!==i))}>×</button>
          </div>
        ))}
      </div>
      {[1,2,3,4].map(dayNum=>{
        const dayKey=`itinerary_day${dayNum}`;
        const dayItems=bach[dayKey]||[];
        const dayTotal=dayItems.reduce((s,i)=>s+Number(i.cost||0),0);
        const [ni,setNi]=useState({time:"",activity:"",location:"",cost:""});
        const addDayItem=()=>{
          if(!ni.activity)return;
          const updated=[...dayItems,{...ni,id:Date.now()}].sort((a,b)=>a.time.localeCompare(b.time));
          upd(dayKey,updated);
          setNi({time:"",activity:"",location:"",cost:""});
        };
        return (
          <div className="card" key={dayNum}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15,color:C.pinkDeep}} className="pf">🗓 Day {dayNum}</div>
              {dayTotal>0&&<div style={{fontSize:12,color:C.textLight}}>Est: <strong style={{color:C.orange}}>${dayTotal.toLocaleString()}</strong></div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"90px 2fr 1.5fr 70px auto",gap:6,marginBottom:8}}>
              <input type="time" value={ni.time} onChange={e=>setNi(p=>({...p,time:e.target.value}))}/>
              <input type="text" placeholder="Activity" value={ni.activity} onChange={e=>setNi(p=>({...p,activity:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addDayItem()}/>
              <input type="text" placeholder="Location / venue" value={ni.location} onChange={e=>setNi(p=>({...p,location:e.target.value}))}/>
              <input type="number" placeholder="$" value={ni.cost} onChange={e=>setNi(p=>({...p,cost:e.target.value}))}/>
              <button className="btn-primary" style={{padding:"4px 10px"}} onClick={addDayItem}>+</button>
            </div>
            {dayItems.length===0&&<div style={{fontSize:12,color:C.textLight,fontStyle:"italic",padding:"4px 0"}}>No activities yet — add one above</div>}
            {dayItems.map((it,i)=>(
              <div key={it.id||i} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.borderLight}`,fontSize:12}}>
                <span style={{color:C.orange,fontWeight:700,minWidth:44}}>{it.time||"—"}</span>
                <span style={{flex:1,fontWeight:600}}>{it.activity}</span>
                <span style={{color:C.textLight}}>{it.location}</span>
                {Number(it.cost)>0&&<span style={{color:C.gold,fontWeight:600}}>${Number(it.cost).toLocaleString()}</span>}
                <button className="btn-icon" style={{fontSize:14}} onClick={()=>upd(dayKey,dayItems.filter((_,j)=>j!==i))}>×</button>
              </div>
            ))}
          </div>
        );
      })}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:15,color:C.pinkDeep,marginBottom:12}} className="pf">💡 Ideas</div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <input type="text" placeholder="Add idea…" value={newIdea} onChange={e=>setNewIdea(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addIdea()} style={{flex:1}}/>
            <button className="btn-primary" style={{padding:"4px 10px"}} onClick={addIdea}>+</button>
          </div>
          {ideas.map((idea,i)=>(
            <div key={i} style={{background:C.pinkPale,borderRadius:6,padding:"6px 10px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}}>
              <span>{idea}</span>
              <button className="btn-icon" style={{fontSize:13}} onClick={()=>upd("ideas",ideas.filter((_,j)=>j!==i))}>×</button>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,color:C.pinkDeep}} className="pf">🧳 Packing</div>
            <span style={{fontSize:11,color:C.textLight}}>{packed}/{packing.length} packed</span>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <input type="text" placeholder="Add item…" value={newPack} onChange={e=>setNewPack(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPack()} style={{flex:1}}/>
            <button className="btn-primary" style={{padding:"4px 10px"}} onClick={addPack}>+</button>
          </div>
          {packing.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.borderLight}`}}>
              <input type="checkbox" checked={item.checked} onChange={()=>togPack(item.id)} style={{accentColor:C.pink,flexShrink:0}}/>
              <input type="text" value={item.text} onChange={e=>upd("packing",packing.map(p=>p.id===item.id?{...p,text:e.target.value}:p))} style={{flex:1,border:"none",background:"transparent",fontSize:12,color:item.checked?C.textLight:C.text,textDecoration:item.checked?"line-through":"none",padding:0,outline:"none"}}/>
              <button className="btn-icon" style={{fontSize:13,color:C.textLight,flexShrink:0}} onClick={()=>upd("packing",packing.filter(p=>p.id!==item.id))}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TAB: QUICK GROUNDING ──
function TabWhoopee() {
  const [pressed,setPressed]=useState(false);
  const [count,setCount]=useState(0);
  const [label,setLabel]=useState("Tap to relieve stress");
  const FART_LABELS=["The Classic 💨","The Squeaker 🐭","The Wet One 💧","Deep Rumble 🌋","The Finale 🎺","Quick Toot 🎵","The Subtle One 🤫","Absolute Unit 💥"];
  const playFart=()=>{
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const type=count%8,now=ctx.currentTime;
      const makeNoise=(freq,dur,Q=1,gainVal=0.6)=>{
        const buf=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate);
        const data=buf.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
        const src=ctx.createBufferSource();src.buffer=buf;
        const filt=ctx.createBiquadFilter();filt.type="bandpass";filt.frequency.value=freq;filt.Q.value=Q;
        const gain=ctx.createGain();gain.gain.setValueAtTime(gainVal,now);gain.gain.exponentialRampToValueAtTime(0.001,now+dur);
        src.connect(filt);filt.connect(gain);gain.connect(ctx.destination);src.start(now);src.stop(now+dur);
      };
      const osc=(freq,dur,t="sine",g=0.3)=>{
        const o=ctx.createOscillator(),gn=ctx.createGain();
        o.type=t;o.frequency.setValueAtTime(freq,now);gn.gain.setValueAtTime(g,now);gn.gain.exponentialRampToValueAtTime(0.001,now+dur);
        o.connect(gn);gn.connect(ctx.destination);o.start(now);o.stop(now+dur);
      };
      if(type===0){makeNoise(300,0.6,2,0.7);osc(80,0.6,"sawtooth",0.2);}
      else if(type===1){makeNoise(800,0.25,8,0.5);osc(400,0.25,"square",0.15);}
      else if(type===2){makeNoise(250,0.8,1.5,0.8);}
      else if(type===3){makeNoise(150,1.2,1,0.9);osc(60,1.2,"sawtooth",0.4);}
      else if(type===4){[0,0.1,0.2,0.3,0.5,0.7].forEach((t)=>{osc(200-t*20,0.12,"sawtooth",0.3);});}
      else if(type===5){makeNoise(500,0.15,5,0.6);}
      else if(type===6){makeNoise(400,0.4,3,0.3);}
      else{makeNoise(200,1.8,1.2,1.0);osc(50,1.8,"sawtooth",0.5);}
      setCount(p=>p+1);setLabel(FART_LABELS[type]);
    }catch(e){setLabel("🔇 Audio blocked");}
  };
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:24,padding:32,textAlign:"center"}}>
      <div className="pf" style={{fontSize:28,fontWeight:900,color:C.pinkDeep}}>Quick Grounding 🌬️</div>
      <div style={{fontSize:13,color:C.textLight,maxWidth:320}}>Wedding planning stressing you out? This is a judgement-free zone. Let it out.</div>
      <div onClick={()=>{setPressed(true);playFart();setTimeout(()=>setPressed(false),200);}}
        style={{width:200,height:160,borderRadius:"50%",background:pressed?`radial-gradient(ellipse at 45% 40%,#F5C4B8,${C.pink})`:`radial-gradient(ellipse at 38% 35%,#FAE0D5,${C.pinkLight})`,border:`3px solid ${C.pink}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:0,transform:pressed?"scale(0.88) scaleY(0.75)":"scale(1)",transition:"transform 0.08s ease",boxShadow:pressed?`0 2px 8px rgba(232,128,106,0.3)`:`0 10px 32px rgba(232,128,106,0.25)`,userSelect:"none"}}>
        <span style={{fontSize:52,lineHeight:1,marginBottom:4}}>💨</span>
        <span style={{fontSize:10,color:C.pinkDeep,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase"}}>squeeze me</span>
      </div>
      {count>0&&<div style={{fontSize:18,fontWeight:700,color:C.orange}}>{label}</div>}
      {count>0&&<div style={{fontSize:12,color:C.textLight}}>Toots released: <strong style={{color:C.pink}}>{count}</strong></div>}
      {count>=5&&<div style={{fontSize:12,color:C.teal,background:C.tealLight,padding:"6px 16px",borderRadius:20,fontWeight:600}}>✨ You're doing great. Deep breath. Back to planning!</div>}
    </div>
  );
}

// ── SYNC STATUS INDICATOR ──
function SyncDot({ syncing }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:syncing?C.gold:C.teal}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:syncing?C.gold:C.teal,boxShadow:`0 0 0 2px ${syncing?C.goldLight:C.tealLight}`}}/>
      {syncing?"Saving…":"Synced ✓"}
    </div>
  );
}

// ── MAIN APP ──
export default function App() {
  const [config, setConfig] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [wishlist, setWishlist] = useState({must_haves:[],nice_to_haves:[],absolutely_not:[]});
  const [bach, setBach] = useState({squad:[],ideas:[],packing:DEFAULT_PACKING.map((t,i)=>({id:i,text:t,checked:false}))});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState("Timeline");
  const [modalTask, setModalTask] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  // ── LOAD ALL DATA ──
  useEffect(() => {
    async function loadAll() {
      const [cfgRes, tasksRes, budgetRes, wishRes, bachRes] = await Promise.all([
        supabase.from("wedding_config").select(),
        supabase.from("tasks").select(),
        supabase.from("budget_items").select(),
        supabase.from("wishlist").select(),
        supabase.from("bachelorette").select(),
      ]);
      if (cfgRes.data?.[0]) setConfig(cfgRes.data[0]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (budgetRes.data) setBudgetItems(budgetRes.data);
      if (wishRes.data?.[0]) setWishlist(wishRes.data[0]);
      if (bachRes.data?.[0]) setBach(bachRes.data[0]);
      setLoading(false);
    }
    loadAll();

    // Realtime subscriptions
    const unsubs = [
      supabase._subscribe("wedding_config", async () => { const {data} = await supabase.from("wedding_config").select(); if(data?.[0]) setConfig(data[0]); }),
      supabase._subscribe("tasks", async () => { const {data} = await supabase.from("tasks").select(); if(data) setTasks(data); }),
      supabase._subscribe("budget_items", async () => { const {data} = await supabase.from("budget_items").select(); if(data) setBudgetItems(data); }),
      supabase._subscribe("wishlist", async () => { const {data} = await supabase.from("wishlist").select(); if(data?.[0]) setWishlist(data[0]); }),
      supabase._subscribe("bachelorette", async () => { const {data} = await supabase.from("bachelorette").select(); if(data?.[0]) setBach(data[0]); }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  const save = async (table, data) => {
    setSyncing(true);
    await supabase.from(table).upsert(data);
    setTimeout(() => setSyncing(false), 600);
  };

  // ── SETUP ──
  const handleSetup = async ({ bride, partner, date, budget }) => {
    const cfg = { id:"main", bride_name:bride, partner_name:partner, wedding_date:date, budget };
    setConfig(cfg);
    await save("wedding_config", cfg);
    const seedTasks = TASK_TEMPLATES.map(t => ({
      id: t.id, category: t.category, task: t.task,
      months_before: t.monthsBefore, cost: t.cost, priority: t.priority,
      detail_type: t.detailType, done: false, details: {},
      due_date: calcDueDate(date, t.monthsBefore)?.toISOString() || null,
      custom: false, sort_order: Number(t.id)
    }));
    setTasks(seedTasks);
    await save("tasks", seedTasks);
    const budgetSeed = seedTasks.filter(t=>t.cost>0).map(t=>({id:t.id,name:t.task,estimated:t.cost,actual:0}));
    setBudgetItems(budgetSeed);
    await save("budget_items", budgetSeed);
  };

  // ── TASK ACTIONS ──
  const toggleTask = async (id, done) => {
    setTasks(p => p.map(t => t.id===id ? {...t,done} : t));
    await save("tasks", {id, done});
  };

  const saveDetails = async (id, details) => {
    setTasks(p => p.map(t => t.id===id ? {...t,details} : t));
    await save("tasks", {id, details});
    setModalTask(null);
  };

  const addCustomTask = async ({ task, category, dueDate, cost, priority, notes }) => {
    const id = `custom_${Date.now()}`;
    const detailType = category==="Vendors"?"vendor":category==="Attire"?"dress":category==="Guests"?"guestlist":category==="Stationery"?"stationery":"admin";
    const newT = { id, category, task, months_before:null, cost, priority, detail_type:detailType, done:false, details:notes?{notes}:{}, due_date:dueDate?new Date(dueDate).toISOString():null, custom:true, sort_order:999 };
    setTasks(p => [...p, newT]);
    await save("tasks", newT);
    if (cost > 0) {
      const bi = {id, name:task, estimated:cost, actual:0};
      setBudgetItems(p => [...p, bi]);
      await save("budget_items", bi);
    }
  };

  // ── CONFIG UPDATE ──
  const handleEditSave = async (updates) => {
    const newCfg = {...config, ...updates};
    setConfig(newCfg);
    if (updates.wedding_date !== config.wedding_date) {
      const updated = tasks.map(t => ({...t, due_date: t.months_before!=null ? calcDueDate(updates.wedding_date, t.months_before)?.toISOString()||null : t.due_date}));
      setTasks(updated);
      await save("tasks", updated);
    }
    await save("wedding_config", newCfg);
    setEditOpen(false);
  };

  // ── WISHLIST ──
  const updateWishlist = async (updated) => {
    setWishlist(updated);
    await save("wishlist", {...updated, id:"main"});
  };

  // ── BACHELORETTE ──
  const updateBach = async (updated) => {
    setBach(updated);
    await save("bachelorette", {...updated, id:"main"});
  };

  // ── BUDGET ──
  const updateActual = async (id, actual) => {
    setBudgetItems(p => p.map(i => i.id===id ? {...i,actual} : i));
    await save("budget_items", {id, actual});
  };

  // ── DERIVED METRICS ──
  const t0 = today();
  const overdue = tasks.filter(t=>{ const d=t.due_date||t.dueDate; return d&&new Date(d).setHours(0,0,0,0)<t0.getTime()&&!t.done; });
  const dueSoon = tasks.filter(t=>{ const d=t.due_date||t.dueDate; if(!d||t.done)return false; const diff=Math.round((new Date(d).setHours(0,0,0,0)-t0.getTime())/86400000); return diff>=0&&diff<=60; });
  const done = tasks.filter(t=>t.done).length;
  const pct = tasks.length ? Math.round(done/tasks.length*100) : 0;
  const actual = budgetItems.reduce((s,i)=>s+(i.actual||0),0);
  const remaining = (config?.budget||25000) - actual;

  const TABS = ["Timeline","Calendar","Budget","Vendors","Vision","Bachelorette","Quick Grounding"];

  if (loading) return <><style>{GLOBAL_STYLE}</style><Spinner/></>;
  if (!config || !config.wedding_date) return <><style>{GLOBAL_STYLE}</style><SetupScreen onComplete={handleSetup}/></>;

  const weddingDate = config.wedding_date;

  return (
    <div style={{minHeight:"100vh",background:C.bg}}>
      <style>{GLOBAL_STYLE}</style>

      {/* HEADER */}
      <div style={{background:C.pinkPale,borderBottom:`1px solid ${C.pinkLight}`,position:"relative",overflow:"hidden"}}>
        <PalmBg/>
        <div style={{position:"relative",zIndex:1,padding:"24px 24px 0"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:24,alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Planning for</div>
              <div className="pf" style={{fontSize:32,fontWeight:900,lineHeight:1.1}}>
                <span style={{color:C.orange}}>{config.bride_name||"Bride"}</span>
                <span style={{color:C.pinkLight,fontWeight:400}}> & </span>
                <span style={{color:C.orange}}>{config.partner_name||"Partner"}</span>
              </div>
              {weddingDate&&<div className="pf" style={{fontSize:16,color:C.pinkDeep,marginTop:4}}>{new Date(weddingDate).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>}
              <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
                <button className="btn-ghost" onClick={()=>setEditOpen(true)}>Edit details</button>
                <SyncDot syncing={syncing}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"center"}}><CountdownTicker weddingDate={weddingDate}/></div>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 16px",minWidth:170,boxShadow:"0 2px 8px rgba(212,98,42,0.06)"}}>
                <div style={{fontSize:9,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Albany, Bahamas</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:26}}>🌤️</span>
                  <span className="pf" style={{fontSize:26,fontWeight:900,color:C.orange}}>77°F</span>
                </div>
                <div style={{fontSize:12,color:C.textMid,fontWeight:500}}>Partly sunny</div>
                <div style={{display:"flex",gap:10,marginTop:6}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",background:C.orangePale,borderRadius:5,padding:"3px 8px"}}>
                    <span style={{fontSize:9,fontWeight:700,color:C.textLight,textTransform:"uppercase"}}>Rain</span>
                    <span style={{fontSize:12,fontWeight:700,color:C.orange}}>15%</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",background:"#FFF8E0",borderRadius:5,padding:"3px 8px"}}>
                    <span style={{fontSize:9,fontWeight:700,color:C.textLight,textTransform:"uppercase"}}>UV</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#C49A00"}}>9 High</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{marginTop:16,height:3,background:C.pinkLight,borderRadius:2}}>
            <div style={{width:`${pct}%`,height:"100%",background:C.orange,borderRadius:2,transition:"width 0.5s"}}/>
          </div>
          <div style={{display:"flex",gap:0,overflowX:"auto",position:"relative",zIndex:10}}>
            {TABS.map(t=>(
              <button key={t} className={`tab-btn${tab===t?" active":""}`} onClick={()=>setTab(t)} style={{pointerEvents:"auto"}}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"24px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
          <MetricCard label="Progress" value={`${pct}%`} sub={`${done} of ${tasks.length} tasks`} accent={C.pink}/>
          <MetricCard label="Overdue" value={overdue.length} sub={overdue.length>0?"Action needed!":"All on track 🎉"} accent={overdue.length>0?C.orange:C.teal}/>
          <MetricCard label="Due soon" value={dueSoon.length} sub="Within 60 days" accent={C.gold}/>
          <MetricCard label="Budget left" value={`$${remaining.toLocaleString()}`} sub={`of $${(config.budget||25000).toLocaleString()}`} accent={remaining<0?C.orange:C.teal}/>
        </div>
        {overdue.length>0&&(
          <div style={{background:C.pinkPale,border:`1px solid ${C.pinkLight}`,borderLeft:`4px solid ${C.orange}`,borderRadius:8,padding:"12px 16px",marginBottom:20}}>
            <div style={{fontWeight:700,fontSize:13,color:C.pinkDeep,marginBottom:6}}>⚠️ Overdue tasks</div>
            {overdue.slice(0,3).map(t=><div key={t.id} style={{fontSize:12,color:C.textMid,marginBottom:3}}>• {t.task} — <span style={{color:C.orange}}>{fmtDate(t.due_date||t.dueDate)}</span></div>)}
            {overdue.length>3&&<div style={{fontSize:12,color:C.textLight}}>+{overdue.length-3} more</div>}
          </div>
        )}
        {tab==="Timeline"&&<TabTimeline tasks={tasks} onToggle={toggleTask} onDetails={setModalTask} onAddTask={addCustomTask}/>}
        {tab==="Calendar"&&<TabCalendar tasks={tasks} weddingDate={weddingDate}/>}
        {tab==="Budget"&&<TabBudget budget={config.budget||25000} budgetItems={budgetItems} onUpdateActual={updateActual}/>}
        {tab==="Vendors"&&<TabVendors tasks={tasks} onToggle={toggleTask} onDetails={setModalTask}/>}
        {tab==="Vision"&&<TabVision wishlist={wishlist} onUpdate={updateWishlist}/>}
        {tab==="Bachelorette"&&<TabBachelorette bach={bach} onUpdate={updateBach}/>}
        {tab==="Quick Grounding"&&<TabWhoopee/>}
      </div>

      {modalTask&&<DetailModal task={modalTask} onSave={(details)=>saveDetails(modalTask.id,details)} onClose={()=>setModalTask(null)}/>}
      {editOpen&&<EditModal config={config} onSave={handleEditSave} onClose={()=>setEditOpen(false)}/>}
    </div>
  );
}
