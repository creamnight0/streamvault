/* ============ StreamVault — sample data ============ */

const CATEGORIES = [
  { slug:"desi",        name:"Desi",          emoji:"🌶️", count:8120, hot:true },
  { slug:"gaming",      name:"Gaming",        emoji:"🎮", count:12480 },
  { slug:"music",       name:"Music",         emoji:"🎵", count:9873 },
  { slug:"sports",      name:"Sports",        emoji:"🏆", count:7241 },
  { slug:"comedy",      name:"Comedy",        emoji:"😂", count:6390 },
  { slug:"education",   name:"Education",     emoji:"📚", count:5822 },
  { slug:"technology",  name:"Technology",    emoji:"💻", count:5514 },
  { slug:"travel",      name:"Travel",        emoji:"✈️", count:4907 },
  { slug:"cooking",     name:"Cooking",       emoji:"🍳", count:4655 },
  { slug:"fitness",     name:"Fitness",       emoji:"💪", count:4102 },
  { slug:"news",        name:"News",          emoji:"📰", count:3980 },
  { slug:"movies",      name:"Movies & TV",   emoji:"🎬", count:3611 },
  { slug:"animation",   name:"Animation",     emoji:"🎨", count:3247 },
  { slug:"podcasts",    name:"Podcasts",      emoji:"🎙️", count:2890 },
  { slug:"science",     name:"Science",       emoji:"🔬", count:2544 },
  { slug:"documentary", name:"Documentary",   emoji:"🎞️", count:2130 },
  { slug:"art",         name:"Art & Design",  emoji:"🖌️", count:1988 },
  { slug:"vlogs",       name:"Vlogs",         emoji:"📹", count:1745 },
  { slug:"autos",       name:"Autos",         emoji:"🚗", count:1512 },
];

const CREATORS = [
  { id:"streamvault",   name:"StreamVault Studio", verified:true, subs:"—", emoji:"▶", grad:["#06b6d4","#7c3aed"], about:"Official uploads from the StreamVault team." },
  { id:"pixelpioneer",  name:"PixelPioneer",   verified:true,  subs:"2.4M", emoji:"👾", grad:["#8b5cf6","#22d3ee"], about:"Daily gaming deep-dives, speedruns, and indie spotlights." },
  { id:"chefmarisol",   name:"Chef Marisol",   verified:true,  subs:"1.8M", emoji:"👩‍🍳", grad:["#f59e0b","#ef4444"], about:"Weeknight recipes that actually work. New videos Tue & Fri." },
  { id:"orbitlabs",     name:"Orbit Labs",     verified:true,  subs:"3.1M", emoji:"🚀", grad:["#22d3ee","#34d399"], about:"Space, physics, and engineering explained visually." },
  { id:"wanderwithmia", name:"Wander With Mia",verified:false, subs:"640K", emoji:"🌍", grad:["#34d399","#22d3ee"], about:"Budget travel guides from 60+ countries." },
  { id:"riffcity",      name:"RiffCity",       verified:true,  subs:"1.2M", emoji:"🎸", grad:["#f471b5","#8b5cf6"], about:"Guitar lessons, gear reviews, and live sessions." },
  { id:"formfit",       name:"FormFit",        verified:false, subs:"890K", emoji:"🏋️", grad:["#ef4444","#f59e0b"], about:"Evidence-based training and mobility programs." },
  { id:"docuverse",     name:"DocuVerse",      verified:true,  subs:"2.0M", emoji:"🎥", grad:["#6366f1","#0ea5e9"], about:"Original short documentaries every week." },
  { id:"bytebites",     name:"ByteBites",      verified:false, subs:"410K", emoji:"⚡", grad:["#0ea5e9","#8b5cf6"], about:"Five-minute tech explainers for busy people." },
];

const SAMPLE_SRC = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

/* views is numeric for sorting; ago in minutes */
const VIDEOS = [
  { id:1,  title:"Beating Elden Peak's Final Boss Without Taking Damage", creator:"pixelpioneer", cat:"gaming",      dur:"24:13", mins:24, views:812000, likes:41000, ago:41,    q:"4K", grad:["#8b5cf6","#312e81"], emoji:"🎮", rating:4.9, exclusive:true },
  { id:2,  title:"15-Minute Weeknight Ramen From Scratch",                creator:"chefmarisol",  cat:"cooking",     dur:"14:52", mins:15, views:540000, likes:32000, ago:56,    q:null,  grad:["#f59e0b","#7c2d12"], emoji:"🍜", rating:4.8, exclusive:false },
  { id:3,  title:"Why Rockets Are Suddenly Getting Cheaper",              creator:"orbitlabs",    cat:"science",     dur:"18:07", mins:18, views:1250000,likes:88000, ago:75,    q:"4K", grad:["#0ea5e9","#0f172a"], emoji:"🚀", rating:4.9, exclusive:false },
  { id:4,  title:"48 Hours in Lisbon on $80",                             creator:"wanderwithmia",cat:"travel",      dur:"21:34", mins:22, views:98000,  likes:7600,  ago:95,    q:null,  grad:["#34d399","#064e3b"], emoji:"🌅", rating:4.6, exclusive:false },
  { id:5,  title:"The Pentatonic Trick Every Guitarist Should Know",      creator:"riffcity",     cat:"music",       dur:"11:26", mins:11, views:305000, likes:21000, ago:120,   q:null,  grad:["#f471b5","#831843"], emoji:"🎸", rating:4.7, exclusive:false },
  { id:6,  title:"Full-Body Mobility Routine (Follow Along, No Equipment)",creator:"formfit",     cat:"fitness",     dur:"28:45", mins:29, views:187000, likes:15000, ago:150,   q:null,  grad:["#ef4444","#7f1d1d"], emoji:"🧘", rating:4.8, exclusive:false },
  { id:7,  title:"The Lost Subway Stations of New York — A Mini Documentary", creator:"docuverse", cat:"documentary", dur:"32:18", mins:32, views:2100000,likes:140000,ago:180,  q:"4K", grad:["#6366f1","#1e1b4b"], emoji:"🚇", rating:4.9, exclusive:true },
  { id:8,  title:"I Built a Gaming PC Using Only Marketplace Parts",      creator:"bytebites",    cat:"technology",  dur:"16:40", mins:17, views:456000, likes:29000, ago:210,   q:null,  grad:["#22d3ee","#164e63"], emoji:"🖥️", rating:4.5, exclusive:false },
  { id:9,  title:"Street Food Tour: Bangkok's Night Markets",             creator:"wanderwithmia",cat:"travel",      dur:"26:03", mins:26, views:720000, likes:52000, ago:300,   q:"4K", grad:["#f59e0b","#78350f"], emoji:"🥡", rating:4.8, exclusive:false },
  { id:10, title:"Speedrunning History: The 7-Year Race to Sub-17",       creator:"pixelpioneer", cat:"gaming",      dur:"41:09", mins:41, views:1500000,likes:110000,ago:360,   q:null,  grad:["#a855f7","#4c1d95"], emoji:"⏱️", rating:4.9, exclusive:false },
  { id:11, title:"How Vaccines Are Designed — Animated Explainer",        creator:"orbitlabs",    cat:"science",     dur:"12:55", mins:13, views:890000, likes:67000, ago:420,   q:null,  grad:["#34d399","#065f46"], emoji:"🧬", rating:4.8, exclusive:false },
  { id:12, title:"Perfect Croissants at Home: The 3-Day Method",          creator:"chefmarisol",  cat:"cooking",     dur:"34:27", mins:34, views:1100000,likes:95000, ago:480,   q:"4K", grad:["#fbbf24","#92400e"], emoji:"🥐", rating:4.9, exclusive:true },
  { id:13, title:"Live Looping a Full Song With One Guitar",              creator:"riffcity",     cat:"music",       dur:"19:44", mins:20, views:230000, likes:19000, ago:540,   q:null,  grad:["#ec4899","#701a75"], emoji:"🎛️", rating:4.6, exclusive:false },
  { id:14, title:"Marathon Training Week 1: What Nobody Tells You",       creator:"formfit",      cat:"fitness",     dur:"15:32", mins:16, views:96000,  likes:8200,  ago:600,   q:null,  grad:["#f97316","#7c2d12"], emoji:"🏃", rating:4.4, exclusive:false },
  { id:15, title:"Inside the World's Quietest Room",                      creator:"docuverse",    cat:"documentary", dur:"22:11", mins:22, views:3400000,likes:210000,ago:720,   q:"4K", grad:["#64748b","#0f172a"], emoji:"🤫", rating:4.9, exclusive:false },
  { id:16, title:"Every CPU Socket Explained in 10 Minutes",              creator:"bytebites",    cat:"technology",  dur:"10:18", mins:10, views:310000, likes:22000, ago:840,   q:null,  grad:["#38bdf8","#075985"], emoji:"🔧", rating:4.5, exclusive:false },
  { id:17, title:"The Physics of Figure Skating Jumps",                   creator:"orbitlabs",    cat:"sports",      dur:"13:37", mins:14, views:670000, likes:48000, ago:900,   q:null,  grad:["#22d3ee","#1e3a8a"], emoji:"⛸️", rating:4.7, exclusive:false },
  { id:18, title:"Stand-Up Set: My Landlord Thinks I'm a Chef",           creator:"chefmarisol",  cat:"comedy",      dur:"08:52", mins:9,  views:420000, likes:38000, ago:1080,  q:null,  grad:["#facc15","#713f12"], emoji:"🎤", rating:4.6, exclusive:false },
  { id:19, title:"Drawing a City in One-Point Perspective (Real Time)",   creator:"docuverse",    cat:"art",         dur:"45:30", mins:46, views:150000, likes:13000, ago:1200,  q:null,  grad:["#a78bfa","#3b0764"], emoji:"✏️", rating:4.7, exclusive:false },
  { id:20, title:"Weekly News Recap: Tech, Space, and Sport",             creator:"bytebites",    cat:"news",        dur:"17:21", mins:17, views:88000,  likes:5400,  ago:1320,  q:null,  grad:["#94a3b8","#1e293b"], emoji:"🗞️", rating:4.3, exclusive:false },
  { id:21, title:"Why Animated Films Take 4 Years to Make",               creator:"docuverse",    cat:"animation",   dur:"20:05", mins:20, views:980000, likes:74000, ago:1440,  q:"4K", grad:["#fb7185","#4a044e"], emoji:"🎬", rating:4.8, exclusive:false },
  { id:22, title:"Podcast #142: The Future of Handheld Consoles",         creator:"pixelpioneer", cat:"podcasts",    dur:"58:12", mins:58, views:130000, likes:9800,  ago:1560,  q:null,  grad:["#8b5cf6","#164e63"], emoji:"🎙️", rating:4.5, exclusive:false },
  { id:23, title:"Restoring a 1974 Roadster — Part 1: The Teardown",      creator:"bytebites",    cat:"autos",       dur:"29:48", mins:30, views:260000, likes:20000, ago:1700,  q:"4K", grad:["#ef4444","#111827"], emoji:"🔩", rating:4.7, exclusive:true },
  { id:24, title:"Van Life Q&A: Costs, Safety, and Wifi",                 creator:"wanderwithmia",cat:"vlogs",       dur:"23:59", mins:24, views:112000, likes:9100,  ago:1900,  q:null,  grad:["#10b981","#134e4a"], emoji:"🚐", rating:4.4, exclusive:false },
];

/* Desi category demo videos (replace with your own licensed uploads) */
VIDEOS.push(
  { id:25, title:"Mumbai Street Food Crawl: 12 Stalls in One Night",  creator:"wanderwithmia", cat:"desi", dur:"27:41", mins:28, views:1900000, likes:130000, ago:60,  q:"4K", grad:["#f97316","#7c2d12"], emoji:"🍛", rating:4.9, exclusive:false },
  { id:26, title:"Learning Classical Tabla in 30 Days",               creator:"riffcity",      cat:"desi", dur:"18:22", mins:18, views:640000,  likes:47000,  ago:240, q:null, grad:["#db2777","#500724"], emoji:"🪘", rating:4.7, exclusive:false },
  { id:27, title:"Wedding Season Vlog: Three Cities, Five Outfits",   creator:"wanderwithmia", cat:"desi", dur:"22:10", mins:22, views:880000,  likes:71000,  ago:400, q:"4K", grad:["#eab308","#78350f"], emoji:"💃", rating:4.8, exclusive:true },
  { id:28, title:"Desi Home Cooking: Grandma's Biryani Secrets",      creator:"chefmarisol",   cat:"desi", dur:"31:05", mins:31, views:2400000, likes:180000, ago:520, q:null, grad:["#16a34a","#14532d"], emoji:"🥘", rating:4.9, exclusive:false },
);

const BLOG_POSTS = [
  { slug:"launch",           tag:"Announcements", emoji:"🚀", grad:["#06b6d4","#7c3aed"], date:"September 4, 2026",
    title:"Welcome to the all-new StreamVault",
    excerpt:"A faster player, a cleaner design, and a home for the content you actually want to watch.",
    body:[
      "Today we're rolling out the biggest redesign in StreamVault's history: a brand-new light interface, a faster player, and a smarter home page that puts categories one click away.",
      "Every video is now transcoded through our quality-first pipeline, which means smaller files and faster starts with no visible quality loss — even on mobile data.",
      "We built this for viewers first: no clutter, no dark patterns, and a Report button on every single video. Have feedback? We read everything sent to the Help Center.",
    ]},
  { slug:"trending-desi",    tag:"Spotlight", emoji:"🌶️", grad:["#f97316","#db2777"], date:"September 2, 2026",
    title:"Trending: the rise of Desi creators on StreamVault",
    excerpt:"Food crawls, tabla lessons, wedding vlogs — South Asian creators are having a moment. Here's what's blowing up.",
    body:[
      "From Mumbai street-food marathons to classical music tutorials, Desi content is the fastest-growing category on StreamVault this quarter.",
      "Our new Desi category collects the best of it in one place — every video uploaded by its rightful creator, with full consent and licensing on record. That's a hard rule, not a nice-to-have.",
      "Want your work featured? Publish through the studio panel, tag it accurately, and our editorial team reviews the top performers every Friday.",
    ]},
  { slug:"quality-pipeline", tag:"Engineering", emoji:"⚙️", grad:["#0ea5e9","#1e3a8a"], date:"August 28, 2026",
    title:"How we compress video without killing quality",
    excerpt:"Inside the encoding ladder: AV1, per-title optimization, and why your uploads look better at half the bitrate.",
    body:[
      "When you upload to StreamVault, your master file is analyzed scene by scene. Complex, high-motion scenes get more bits; static talking-head shots get fewer. This is called per-title encoding.",
      "We encode an AV1 and H.265 ladder from 240p up to the source resolution, capped at visually-lossless quality targets (VMAF 95+). The result: files typically 40–60% smaller than the upload with no perceptible difference.",
      "Originals are archived untouched, so as codecs improve we can re-encode your whole library from the pristine source.",
    ]},
  { slug:"safety-first",     tag:"Trust & Safety", emoji:"🛡️", grad:["#059669","#064e3b"], date:"August 20, 2026",
    title:"Our safety commitments, in plain language",
    excerpt:"Age assurance, consent records, hash-matching, and a real appeals process — what we do and why.",
    body:[
      "Every platform says it takes safety seriously. Here's what that concretely means at StreamVault: every upload is hash-checked against illegal-content databases before it publishes, and every video carries a Report button that routes to a 24/7 queue.",
      "Age-restricted material sits behind real age assurance — not just a checkbox — in regions that require it, and our full policy library is public: from the Child Safety Policy to Complaints & Appeals.",
      "Consent and licensing records are required for everything we publish, kept for the life of the content plus seven years.",
    ]},
];
