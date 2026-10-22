const KEY="sd-demo-sales-v3";
const $=id=>document.getElementById(id);
const encoder=new TextEncoder();
function sales(){try{const value=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(value)?value:[]}catch{return[]}}
function money(n){return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n)}
function bytesToHex(buffer){return Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,"0")).join("")}
async function passwordHash(password,saltHex,iterations){
  const salt=new Uint8Array(saltHex.match(/.{2}/g).map(byte=>parseInt(byte,16)));
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations,hash:"SHA-256"},key,256);
  return bytesToHex(bits);
}
async function validateLogin(username,password){
  if(!window.SD_USERS||!Array.isArray(window.SD_USERS))return false;
  const user=window.SD_USERS.find(item=>item.username.toLowerCase()===username.trim().toLowerCase());
  if(!user)return false;
  const actual=await passwordHash(password,user.salt,user.iterations);
  return actual===user.hash;
}
function showApp(username){
  $("splash").hidden=true;$("login-screen").hidden=true;$("app-shell").hidden=false;
  $("seller-name").textContent=username;$("welcome-name").textContent=username;
  sessionStorage.setItem("sd-session-user",username);
  updateNetwork();render();
}
function showLogin(){
  sessionStorage.removeItem("sd-session-user");
  $("app-shell").hidden=true;$("splash").hidden=true;$("login-screen").hidden=false;
  $("password").value="";$("username").focus();
}
function render(){
  const items=sales();const total=items.reduce((sum,item)=>sum+Number(item.amount||0),0);
  $("total").textContent=money(total);$("commission").textContent=money(total*.05);$("list").replaceChildren();
  if(!items.length){const p=document.createElement("p");p.className="muted";p.textContent="Todavía no hay ventas de prueba.";$("list").append(p)}
  items.slice().reverse().forEach(item=>{
    const row=document.createElement("div");row.className="sale";const left=document.createElement("div");
    const store=document.createElement("b");store.textContent=item.store;const meta=document.createElement("small");
    meta.textContent=`${item.type} · ${item.date} · Guardada solo en este dispositivo`;
    left.append(store,meta);const amount=document.createElement("strong");amount.textContent=money(Number(item.amount));row.append(left,amount);$("list").append(row)
  });
}
$("login-form").addEventListener("submit",async event=>{
  event.preventDefault();const username=$("username").value.trim();const password=$("password").value;
  const button=$("login-button");const error=$("login-error");button.disabled=true;button.textContent="Validando…";error.hidden=true;
  try{
    if(await validateLogin(username,password)){showApp(username)}
    else{error.hidden=false;$("password").value="";$("password").focus()}
  }catch(err){error.textContent="No se pudo validar el acceso en este navegador. Actualiza Chrome e inténtalo de nuevo.";error.hidden=false;console.error(err)}
  finally{button.disabled=false;button.textContent="Ingresar"}
});
$("form").addEventListener("submit",event=>{
  event.preventDefault();const store=$("store").value.trim();const amount=Number($("amount").value);
  if(!store||!Number.isFinite(amount)||amount<=0)return;
  const items=sales();items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(16).slice(2),store,amount,type:$("type").value,date:new Date().toLocaleString("es-MX"),seller:sessionStorage.getItem("sd-session-user")||""});
  try{localStorage.setItem(KEY,JSON.stringify(items));$("notice").textContent="Venta ficticia guardada en este dispositivo. No se envió a un servidor.";$("notice").hidden=false;$("form").reset();render()}
  catch(error){$("notice").textContent="No se pudo guardar en el navegador. Comprueba el espacio disponible.";$("notice").hidden=false}
});
$("clear").addEventListener("click",()=>{if(confirm("¿Borrar las ventas ficticias de esta demo en este dispositivo?")){localStorage.removeItem(KEY);render()}});
$("export").addEventListener("click",()=>{
  const rows=[["ID","Tienda","Tipo","Importe MXN","Fecha","Vendedor"],...sales().map(x=>[x.id,x.store,x.type,x.amount,x.date,x.seller||""])];
  const csv=rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(",")).join("\\r\\n");
  const url=URL.createObjectURL(new Blob(["\\ufeff"+csv],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");
  link.href=url;link.download="semilla-dorada-demo.csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
});
$("logout").addEventListener("click",showLogin);
function updateNetwork(){const online=navigator.onLine;$("network").textContent=online?"Con conexión":"Sin conexión";$("network").setAttribute("aria-label",online?"Con conexión":"Sin conexión")}
addEventListener("online",updateNetwork);addEventListener("offline",updateNetwork);
function startFlow(){
  $("splash").hidden=false;$("login-screen").hidden=true;$("app-shell").hidden=true;
  window.setTimeout(()=>{if(sessionStorage.getItem("sd-session-user"))showApp(sessionStorage.getItem("sd-session-user"));else showLogin()},2000);
}
updateNetwork();
if("serviceWorker"in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(err=>console.error("No se pudo registrar el modo offline:",err)))
}
startFlow();
