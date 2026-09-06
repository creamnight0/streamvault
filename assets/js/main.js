/* ============ StreamVault — shared layout + page logic ============ */

const LEGAL_LINKS = [
  ["terms.html","Terms of Service"],
  ["privacy.html","Privacy Policy"],
  ["2257.html","2257 Statement"],
  ["dmca.html","DMCA"],
  ["content-production-guide.html","Content Production Guide"],
  ["content-submission-guidelines.html","Content Submission Guidelines"],
  ["uk-users.html","Information for Users in the UK"],
  ["child-safety.html","Child Safety Policy"],
  ["illegal-content-reporting.html","Illegal Content Reporting Policy"],
  ["age-assurance.html","Age Assurance Policy"],
  ["complaints-appeals.html","Complaints & Appeals Policy"],
  ["law-enforcement.html","Law Enforcement Requests"],
  ["content-removal.html","Content Removal Request"],
  ["content-guidelines.html","Content Guidelines"],
  ["cookie-notice.html","Cookie Notice"],
];

function fmtViews(n){
  if(n>=1e6) return (n/1e6).toFixed(1).replace(/\.0$/,"")+"M";
  if(n>=1e3) return (n/1e3).toFixed(0)+"K";
  return String(n);
}
function fmtAgo(mins){
  if(mins<60) return mins+" minutes ago";
  const h=Math.round(mins/60);
  if(h<24) return h+(h===1?" hour ago":" hours ago");
  const d=Math.round(h/24);
  return d+(d===1?" day ago":" days ago");
}
function creatorOf(v){ return CREATORS.find(c=>c.id===v.creator) || CREATORS[0]; }
function catOf(v){ return CATEGORIES.find(c=>c.slug===v.cat) || CATEGORIES[0]; }
function qs(name){ return new URLSearchParams(location.search).get(name); }
function store(key, fallback){
  try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch(e){ return fallback; }
}
function storeSet(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

/* ---- merge admin-published videos (localStorage) into the catalog ---- */
function loadAdminVideos(){
  const extra = store("sv-admin-videos", []);
  extra.forEach(v=>{
    if(!VIDEOS.some(x=>x.id===v.id)) {
      v.uploaded = true;
      VIDEOS.unshift(v);
    }
  });
}

/* ---------- 18+ age gate ---------- */
function ageGate(){
  if(store("sv-age-ok", false)) return;
  document.body.classList.add("gated");
  const gate = document.createElement("div");
  gate.className = "age-gate";
  gate.innerHTML = `
    <div class="age-card">
      <div class="mark">▶</div>
      <h2>This website is for adults only</h2>
      <p>You must be <strong>18 years or older</strong> (or the age of majority in your jurisdiction) to enter. By entering you confirm your age and accept our terms.</p>
      <div class="links">
        <a href="terms.html">Terms</a> · <a href="privacy.html">Privacy</a> · <a href="age-assurance.html">Age Assurance</a> · <a href="cookie-notice.html">Cookies</a>
      </div>
      <div class="btns">
        <button class="btn btn-solid" id="age-yes">I am 18 or older — Enter</button>
        <button class="btn btn-ghost" id="age-no">Exit</button>
      </div>
    </div>`;
  document.body.appendChild(gate);
  gate.querySelector("#age-yes").addEventListener("click", ()=>{
    storeSet("sv-age-ok", true);
    document.body.classList.remove("gated");
    gate.remove();
  });
  gate.querySelector("#age-no").addEventListener("click", ()=>{ location.href = "https://www.google.com"; });
}

/* ---------- shared header / nav / footer ---------- */
function renderChrome(){
  const page = document.body.dataset.page || "";
  const header = document.getElementById("site-header");
  if(header){
    header.innerHTML = `
    <div class="utilbar">
      <div class="container">
        <a href="trending.html">Trending</a>
        <a href="categories.html">Categories</a>
        <a href="creators.html">Creators</a>
        <a href="blog.html">Blog</a>
        <a href="premium.html">Go Premium</a>
        <a href="help.html">Help Center</a>
        <a href="admin.html">Admin</a>
      </div>
    </div>
    <div class="header-wrap">
    <header class="site-header">
      <div class="container">
        <a class="logo" href="index.html"><span class="mark">▶</span>STREAM<b>VAULT</b></a>
        <div class="searchbox">
          <span class="icon">🔍</span>
          <input id="global-search" type="search" placeholder="Search videos, creators, categories…" />
        </div>
        <div class="header-actions">
          <a class="btn btn-outline" href="premium.html">✦ Premium</a>
          <a class="btn btn-solid" href="videos.html">Watch Now ▶</a>
          <a class="icon-btn" href="login.html" title="Admin sign in">👤</a>
        </div>
      </div>
    </header>
    <nav class="mainnav">
      <div class="container">
        <a href="index.html" data-nav="home">Home</a>
        <a href="videos.html" data-nav="videos">Videos</a>
        <a href="categories.html" data-nav="categories">Categories</a>
        <a href="creators.html" data-nav="creators">Creators</a>
        <a href="trending.html" data-nav="trending">Trending</a>
        <a href="playlists.html" data-nav="playlists">Playlists</a>
        <a href="blog.html" data-nav="blog">Blog</a>
        <a href="premium.html" data-nav="premium">Premium</a>
        <a href="help.html" data-nav="help">Help</a>
      </div>
    </nav>
    </div>`;
    const active = header.querySelector(`[data-nav="${page}"]`);
    if(active) active.classList.add("active");

    const s = header.querySelector("#global-search");
    s.addEventListener("keydown", e=>{
      if(e.key==="Enter" && s.value.trim())
        location.href = "search.html?q="+encodeURIComponent(s.value.trim());
    });
  }

  const footer = document.getElementById("site-footer");
  if(footer){
    footer.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <a class="logo" href="index.html" style="font-size:20px"><span class="mark" style="width:30px;height:30px;font-size:15px">▶</span>STREAM<b>VAULT</b></a>
          <p class="blurb">A curated video platform. Every upload is owned or licensed by us, published with documented consent, and reviewed before release.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <ul>
            <li><a href="videos.html">All Videos</a></li>
            <li><a href="categories.html">Categories</a></li>
            <li><a href="creators.html">Creators</a></li>
            <li><a href="trending.html">Trending</a></li>
            <li><a href="playlists.html">Playlists</a></li>
            <li><a href="blog.html">Blog</a></li>
            <li><a href="premium.html">Premium</a></li>
          </ul>
        </div>
        <div>
          <h4>Studio</h4>
          <ul>
            <li><a href="admin.html">Admin Panel</a></li>
            <li><a href="content-production-guide.html">Production Guide</a></li>
            <li><a href="content-submission-guidelines.html">Submission Guidelines</a></li>
            <li><a href="content-guidelines.html">Content Guidelines</a></li>
            <li><a href="help.html">Help Center</a></li>
          </ul>
        </div>
        <div>
          <h4>Legal &amp; Safety</h4>
          <ul id="footer-legal"></ul>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>© ${new Date().getFullYear()} StreamVault. All rights reserved. 18+ only. Demo site — for design purposes only.</span>
        <span><a href="terms.html">Terms</a> · <a href="privacy.html">Privacy</a> · <a href="cookie-notice.html">Cookies</a> · <a href="content-removal.html">Content Removal</a></span>
      </div>
    </footer>`;
    footer.querySelector("#footer-legal").innerHTML =
      LEGAL_LINKS.map(([href,label])=>`<li><a href="${href}">${label}</a></li>`).join("");
  }
}

/* ---------- cards ---------- */
function videoCard(v){
  const c = creatorOf(v);
  return `
  <div class="card">
    <a class="thumb" href="watch.html?v=${v.id}" style="background:${v.thumb?`url('${v.thumb}') center/cover no-repeat`:`linear-gradient(135deg,${v.grad[0]},${v.grad[1]})`}">
      <span>${v.thumb?"":v.emoji}</span>
      <span class="play"><span>▶</span></span>
      ${v.q?`<span class="badge q">${v.q}</span>`:""}
      <span class="dur">${v.dur}</span>
    </a>
    <a class="title" href="watch.html?v=${v.id}">${v.title}</a>
    <div class="meta">
      <a class="creator" href="creator.html?c=${c.id}">${c.name}</a>${c.verified?'<span class="verified">✔</span>':""}
      <span>👁 ${fmtViews(v.views)}</span>
      <span>❤ ${fmtViews(v.likes)}</span>
      <span>${fmtAgo(v.ago)}</span>
    </div>
  </div>`;
}
function grid(el, items, renderer){
  el.innerHTML = items.length ? items.map(renderer||videoCard).join("") : `<div class="empty">No videos match these filters.</div>`;
}
function catListHTML(activeSlug){
  const total = CATEGORIES.reduce((s,c)=>s+c.count,0);
  return `<li><a href="videos.html" data-cat="all" class="${activeSlug==='all'?'active':''}">All <span class="count">${total.toLocaleString()}</span></a></li>` +
    CATEGORIES.map(c=>`<li><a href="category.html?cat=${c.slug}" data-cat="${c.slug}" class="${activeSlug===c.slug?'active':''}">${c.emoji} ${c.name}${c.hot?' <span class="badge" style="font-size:9px">HOT</span>':''} <span class="count">${c.count.toLocaleString()}</span></a></li>`).join("");
}

document.addEventListener("DOMContentLoaded", ()=>{
  loadAdminVideos();
  renderChrome();
  ageGate();
});
