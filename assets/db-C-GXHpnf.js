import{e as c,b as k,m as j}from"./fs-r8LPfpZx.js";const d=E=>{const e=E.startsWith("/"),T=[];for(const a of E.split("/"))!a||a==="."||(a===".."?T.pop():T.push(a));return(e?"/":"")+T.join("/")||(e?"/":".")},b="/",Y=":",S=(...E)=>d(E.filter(Boolean).join("/")),n=(...E)=>{let e="";for(const T of E)e=T.startsWith("/")?T:`${e}/${T}`;return d(e.startsWith("/")?e:`/device/${e}`)},y=d,X=E=>E.startsWith("/"),L=E=>{const e=d(E),T=e.lastIndexOf("/");return T<=0?e.startsWith("/")?"/":".":e.slice(0,T)},R=(E,e)=>{const T=d(E).split("/").pop()??"";return e&&T.endsWith(e)?T.slice(0,-e.length):T},I=E=>{const e=R(E),T=e.lastIndexOf(".");return T>0?e.slice(T):""},f=(E,e)=>{const T=d(E).split("/").filter(Boolean),a=d(e).split("/").filter(Boolean);let N=0;for(;N<T.length&&T[N]===a[N];)N++;return[...T.slice(N).map(()=>".."),...a.slice(N)].join("/")},G=E=>({root:E.startsWith("/")?"/":"",dir:L(E),base:R(E),ext:I(E),name:R(E,I(E))}),P={sep:b,join:S,resolve:n,normalize:y,isAbsolute:X,dirname:L,basename:R,extname:I,relative:f,parse:G},J={sep:b,delimiter:Y,join:S,resolve:n,normalize:y,isAbsolute:X,dirname:L,basename:R,extname:I,relative:f,parse:G,posix:P},r=globalThis,m=E=>E===void 0?null:typeof E=="boolean"?E?1:0:typeof E=="bigint"?Number(E):E;function O(E){if(E.length===1&&E[0]&&typeof E[0]=="object"&&!Array.isArray(E[0])&&!(E[0]instanceof Uint8Array)){const T={};for(const[a,N]of Object.entries(E[0])){const i=m(N);T[`@${a}`]=i,T[`:${a}`]=i,T[`$${a}`]=i}return T}return(E.length===1&&Array.isArray(E[0])?E[0]:E).map(m)}const W=/^\s*(insert|update|delete|replace|create|drop|alter|pragma\s+\w+\s*=|begin|commit|rollback|savepoint|release|vacuum)/i;class x{constructor(e,T){this.db=e,this.sql=T}stmt(){return this.db.cached(this.sql)}run(...e){const T=this.stmt();try{T.bind(O(e)),T.step()}finally{T.reset()}const a=this.db.raw,N=a.getRowsModified(),i=a.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0]??0;return r.__becomingDirty?.(),{changes:N,lastInsertRowid:Number(i)}}get(...e){const T=this.stmt();try{return T.bind(O(e)),T.step()?T.getAsObject():void 0}finally{T.reset()}}all(...e){const T=this.stmt(),a=[];try{for(T.bind(O(e));T.step();)a.push(T.getAsObject())}finally{T.reset()}return a}}class B{raw;stmts=new Map;depth=0;constructor(e){if(!r.__becomingSqlDb)throw new Error("The device database was not opened before the server started.");this.raw=r.__becomingSqlDb,globalThis.__becomingAfterExport=()=>{this.stmts.clear(),this.raw.exec("PRAGMA foreign_keys = ON")}}cached(e){let T=this.stmts.get(e);if(T)return T;if(T=this.raw.prepare(e),this.stmts.set(e,T),this.stmts.size>600){const[a,N]=this.stmts.entries().next().value;N.free(),this.stmts.delete(a)}return T}prepare(e){return new x(this,e)}exec(e){return this.raw.exec(e),(W.test(e)||/\b(insert|update|delete|create|alter|drop)\b/i.test(e))&&r.__becomingDirty?.(),this}pragma(e,T){const a=this.raw.exec(`PRAGMA ${e}`);/=/.test(e)&&r.__becomingDirty?.();const N=a[0],i=N?N.values.map(o=>Object.fromEntries(N.columns.map((_,l)=>[_,o[l]]))):[];return T?.simple?N?.values[0]?.[0]??void 0:i}transaction(e){const T=(...a)=>{const N=this.depth===0,i=`sp${this.depth}`;this.raw.exec(N?"BEGIN":`SAVEPOINT ${i}`),this.depth+=1;try{const o=e(...a);return this.depth-=1,this.raw.exec(N?"COMMIT":`RELEASE ${i}`),r.__becomingDirty?.(),o}catch(o){throw this.depth-=1,this.raw.exec(N?"ROLLBACK":`ROLLBACK TO ${i}; RELEASE ${i}`),o}};return Object.assign(T,{deferred:T,immediate:T,exclusive:T})}close(){}}const g=`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;


CREATE TABLE IF NOT EXISTS accounts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('cash_subaccount','roth_ira','external')),
  is_reserve  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS balance_snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  balance      REAL NOT NULL,
  source       TEXT NOT NULL DEFAULT 'manual',
  dedupe_hash  TEXT
);
CREATE INDEX IF NOT EXISTS idx_balance_snapshots_date ON balance_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_balance_snapshots_account ON balance_snapshots(account_id, date);

CREATE TABLE IF NOT EXISTS income_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  date          TEXT NOT NULL,
  stream        TEXT NOT NULL,
  gross_amount  REAL NOT NULL,
  client        TEXT,
  processor     TEXT,
  fees          REAL,
  note          TEXT,
  service_type  TEXT,
  source        TEXT NOT NULL DEFAULT 'manual',
  dedupe_hash   TEXT
);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON income_entries(date);
CREATE INDEX IF NOT EXISTS idx_income_entries_stream ON income_entries(stream);

CREATE TABLE IF NOT EXISTS allocations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  income_entry_id  INTEGER REFERENCES income_entries(id) ON DELETE SET NULL,
  money_date       TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('tax','income_deposits','opex','owners_comp','profit_ffa')),
  amount           REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_allocations_money_date ON allocations(money_date);
CREATE INDEX IF NOT EXISTS idx_allocations_role ON allocations(role);

CREATE TABLE IF NOT EXISTS expense_entries (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  date               TEXT NOT NULL,
  amount             REAL NOT NULL,
  note               TEXT,
  tax_category       TEXT,
  business_personal  TEXT NOT NULL DEFAULT 'business' CHECK (business_personal IN ('business','personal','mixed')),
  deductible_pct     REAL,
  service_type       TEXT,
  merchant           TEXT,
  is_transfer        INTEGER NOT NULL DEFAULT 0,
  source             TEXT NOT NULL DEFAULT 'manual',
  dedupe_hash        TEXT
);
CREATE INDEX IF NOT EXISTS idx_expense_entries_date ON expense_entries(date);


CREATE TABLE IF NOT EXISTS kpis (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  quarter        TEXT NOT NULL,
  label          TEXT NOT NULL,
  target_number  REAL NOT NULL,
  current_number REAL NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('off_track','active','complete','cancelled'))
);

CREATE TABLE IF NOT EXISTS aims (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  text        TEXT NOT NULL,
  metric      TEXT,   -- optional link to a live number (see server/momentum.ts)
  sort_order  INTEGER NOT NULL DEFAULT 0
);



CREATE TABLE IF NOT EXISTS vision_boards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,



  intent      TEXT,


  notes       TEXT,
  links_json  TEXT NOT NULL DEFAULT '[]',








  color       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);



CREATE TABLE IF NOT EXISTS vision_statements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id   INTEGER REFERENCES vision_boards(id) ON DELETE CASCADE,
  label       TEXT,
  text        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'vision',



  horizon     TEXT,   -- 'year' | 'horizon' (~3yr) | 'life'
  sort_order  INTEGER NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS daily_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT NOT NULL UNIQUE,
  intention    TEXT,



  keynote      TEXT,
  gratitude    TEXT,
  noticing     TEXT,
  feelings     TEXT,   -- JSON array of feeling keys (Ekman families; see Today.tsx)
  payload_json TEXT NOT NULL DEFAULT '{}'
);



CREATE TABLE IF NOT EXISTS todos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  text        TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  domain_id   INTEGER REFERENCES vision_boards(id) ON DELETE SET NULL,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,   -- an effort within a domain
  start_time  TEXT,           -- optional "HH:MM" — gives the day a shape (Phase 2)


  weight      TEXT NOT NULL DEFAULT 'should' CHECK (weight IN ('must','should','could')),
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);



CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  domain_id   INTEGER REFERENCES vision_boards(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'active',   -- active | someday | done
  intention   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain_id);





CREATE TABLE IF NOT EXISTS time_blocks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  label       TEXT NOT NULL,
  start_time  TEXT,             -- "HH:MM"
  end_time    TEXT,             -- "HH:MM"
  kind        TEXT,             -- focus | meeting | rest | open (private scaffold; never a UI "element" label)
  domain_id   INTEGER REFERENCES vision_boards(id) ON DELETE SET NULL,  -- which vision area this hour serves (alignment mirror)
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,       -- an effort within a domain
  source      TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'calendar' (read-only subscription)
  external_id TEXT,             -- for read-only calendar dedupe/upsert
  sort_order  INTEGER NOT NULL DEFAULT 0,





  ticked      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks(date);




CREATE TABLE IF NOT EXISTS health_meds (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  timing      TEXT,   -- e.g. "afternoon", "4pm", "evening"
  note        TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS lab_panels (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor         TEXT NOT NULL,       -- e.g. "Function Health", "InsideTracker", "manual"
  collected_date TEXT,                -- YYYY-MM-DD
  reported_date  TEXT,
  source_file    TEXT,
  imported_at    TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS biomarkers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  panel_id       INTEGER REFERENCES lab_panels(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  canonical_key  TEXT NOT NULL,
  category       TEXT,
  value          REAL,
  value_text     TEXT,
  unit           TEXT,
  ref_low        REAL,
  ref_high       REAL,
  ref_text       TEXT,
  flag           TEXT,                -- H | L | null
  collected_date TEXT,               -- denormalized for trend queries
  dedupe_hash    TEXT
);
CREATE INDEX IF NOT EXISTS idx_biomarkers_key ON biomarkers(canonical_key, collected_date);





CREATE TABLE IF NOT EXISTS pain_identities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,   -- the role, in their words ("the one who is behind")
  sounds_like TEXT,            -- what it says
  helps       TEXT,            -- what has helped, when it's here
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT
);






CREATE TABLE IF NOT EXISTS feeling_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL,
  feeling    TEXT NOT NULL,   -- the state key, e.g. 'grateful'
  family     TEXT NOT NULL,   -- ekman family key, e.g. 'enjoyment'
  note       TEXT,            -- what it was about, in their words. Optional, always.
  created_at TEXT,
  UNIQUE (date, feeling)
);








CREATE TABLE IF NOT EXISTS feeling_supports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  scope       TEXT NOT NULL CHECK (scope IN ('family','feeling')),
  match_key   TEXT NOT NULL,   -- an Ekman family key, or a single feeling key
  label       TEXT NOT NULL,   -- what helps, in their words
  url         TEXT,            -- optional: an episode, a page
  library_ref TEXT,            -- optional materials: "<libraryId>/<relative path>"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_supports_key ON feeling_supports(match_key);










CREATE TABLE IF NOT EXISTS guides (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  by          TEXT,             -- whose it is: a teacher, a podcast
  url         TEXT,             -- a link: Apple Podcasts, YouTube, any page
  library_id  INTEGER REFERENCES libraries(id) ON DELETE SET NULL,
  path        TEXT,             -- or a file in one of the libraries
  minutes     INTEGER,
  note        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT
);
CREATE TABLE IF NOT EXISTS guide_links (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  guide_id  INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  kind      TEXT NOT NULL CHECK (kind IN ('feeling','family','identity','vision','project','practice')),
  key       TEXT NOT NULL,     -- a feeling or family key; an id, as text, for the rest
  UNIQUE (guide_id, kind, key)
);
CREATE INDEX IF NOT EXISTS idx_guide_links_target ON guide_links(kind, key);

















CREATE TABLE IF NOT EXISTS health_protocols (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,   -- "Bile / digestion, per Dr. Phüntsok"
  question   TEXT,            -- what you are trying to find out
  started    TEXT NOT NULL,   -- YYYY-MM-DD
  ended      TEXT,            -- NULL while running
  created_at TEXT
);












CREATE TABLE IF NOT EXISTS protocol_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol_id  INTEGER NOT NULL REFERENCES health_protocols(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('symptom','adherence','bristol','eating')),
  label        TEXT NOT NULL,


  options_json TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_protocol_items ON protocol_items(protocol_id);

CREATE TABLE IF NOT EXISTS protocol_logs (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  date    TEXT NOT NULL,
  item_id INTEGER NOT NULL REFERENCES protocol_items(id) ON DELETE CASCADE,


  value   INTEGER NOT NULL,



  text    TEXT,
  note    TEXT,
  UNIQUE (date, item_id)
);
CREATE INDEX IF NOT EXISTS idx_protocol_logs_date ON protocol_logs(date);











CREATE TABLE IF NOT EXISTS marker_links (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  alias_key     TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('merge','dismissed')),
  created_at    TEXT,
  UNIQUE (alias_key, canonical_key, kind)
);
CREATE INDEX IF NOT EXISTS idx_marker_links ON marker_links(kind, alias_key);














CREATE TABLE IF NOT EXISTS day_conditions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  date          TEXT NOT NULL UNIQUE,
  lat           REAL,
  lon           REAL,
  place         TEXT,
  temp_max      REAL,
  temp_min      REAL,
  precip_mm     REAL,
  wind_max      REAL,
  pressure_hpa  REAL,
  weather_code  INTEGER,
  sunrise       TEXT,
  sunset        TEXT,
  daylight_min  INTEGER,
  aqi           INTEGER,
  pm25          REAL,
  pollen_tree   REAL,
  pollen_grass  REAL,
  pollen_weed   REAL,
  raw_json      TEXT,
  fetched_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_day_conditions_date ON day_conditions(date);
























CREATE TABLE IF NOT EXISTS content_ideas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  state      TEXT NOT NULL DEFAULT 'concept' CHECK (state IN ('concept','queued','ready','shipped')),
  pillar     TEXT,




  medium     TEXT,
  source     TEXT,
  note       TEXT,
  created_at TEXT NOT NULL,
  shipped_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_content_ideas_state ON content_ideas(state, sort_order);
















CREATE TABLE IF NOT EXISTS content_idea_tags (
  idea_id INTEGER NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (idea_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_content_idea_tags ON content_idea_tags(tag);











CREATE TABLE IF NOT EXISTS block_presets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  note       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS preset_blocks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  preset_id  INTEGER NOT NULL REFERENCES block_presets(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  start_time TEXT,
  end_time   TEXT,
  kind       TEXT,
  note       TEXT,             -- why this block sits here, in their words
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_preset_blocks ON preset_blocks(preset_id, sort_order);





CREATE TABLE IF NOT EXISTS recordings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner       TEXT NOT NULL,
  name        TEXT NOT NULL,
  audio       TEXT,
  duration    INTEGER,
  status      TEXT NOT NULL DEFAULT 'waiting',   -- waiting | working | done | failed
  progress    INTEGER NOT NULL DEFAULT 0,        -- 0–100 while working
  transcript  TEXT,
  error       TEXT,
  created_at  TEXT NOT NULL,
  done_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_recordings_owner ON recordings(owner);





CREATE TABLE IF NOT EXISTS post_metrics (
  idea_id  INTEGER NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,
  likes    INTEGER,
  comments INTEGER,
  reach    INTEGER,
  saves    INTEGER,
  shares   INTEGER,
  views    INTEGER,
  PRIMARY KEY (idea_id, date)
);


CREATE TABLE IF NOT EXISTS account_metrics (
  date      TEXT NOT NULL,
  platform  TEXT NOT NULL,
  followers INTEGER,
  posts     INTEGER,
  PRIMARY KEY (date, platform)
);





CREATE TABLE IF NOT EXISTS weekday_shape_days (
  date      TEXT PRIMARY KEY,
  preset_id INTEGER
);

CREATE TABLE IF NOT EXISTS check_ins (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL CHECK (type IN ('weekly','monthly','quarterly','yearly','money_date','question','looking')),
  date         TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(date);
CREATE INDEX IF NOT EXISTS idx_check_ins_type ON check_ins(type, date);

CREATE TABLE IF NOT EXISTS goals (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('education','instrument','vehicle','home','travel_sabbatical','retreat','family','retirement','other')),
  target_date      TEXT,
  horizon_label    TEXT,
  est_cost         REAL NOT NULL DEFAULT 0,
  cost_buffer_pct  REAL NOT NULL DEFAULT 25,
  classification   TEXT NOT NULL DEFAULT 'mixed' CHECK (classification IN ('asset','liability','mixed')),
  funding_source   TEXT NOT NULL DEFAULT 'savings' CHECK (funding_source IN ('profit_ffa','savings','external','mixed')),



  domain_id        INTEGER REFERENCES vision_boards(id) ON DELETE SET NULL,

  tax_category     TEXT,
  notes            TEXT
);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id      INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  source_label TEXT NOT NULL,
  amount       REAL NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('external_gift','self_saved')),


  expected_date TEXT,
  note         TEXT
);

CREATE TABLE IF NOT EXISTS goal_asset_model (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id                INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  expected_annual_income REAL NOT NULL DEFAULT 0,
  income_start_date      TEXT,
  appreciation_pct       REAL,
  annual_carrying_cost   REAL NOT NULL DEFAULT 0,
  useful_life_years      REAL NOT NULL DEFAULT 0
);




CREATE TABLE IF NOT EXISTS practices (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  label             TEXT NOT NULL,
  cadence           TEXT NOT NULL CHECK (cadence IN ('daily','weekly','biweekly','monthly','quarterly')),
  target_per_period INTEGER NOT NULL DEFAULT 1,
  lane              TEXT,
  weight            INTEGER NOT NULL DEFAULT 1,
  emoji             TEXT,
  minutes_target    INTEGER,   -- a goal in time per period, when it is a timed practice
  active            INTEGER NOT NULL DEFAULT 1,
  library_ref       TEXT,   -- optional: a subfolder in the library root (its materials)
  sort_order        INTEGER NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS practice_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  practice_id INTEGER NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  minutes     INTEGER,   -- how long it was given, when anyone was counting
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_practice_logs_date ON practice_logs(date);





CREATE TABLE IF NOT EXISTS practice_plans (
  practice_id INTEGER NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  period      TEXT NOT NULL,
  dates       TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (practice_id, period)
);
CREATE INDEX IF NOT EXISTS idx_practice_logs_practice ON practice_logs(practice_id, date);



















CREATE TABLE IF NOT EXISTS time_spent (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('practice','todo','block')),
  ref_id     INTEGER NOT NULL,
  minutes    INTEGER NOT NULL,
  source     TEXT NOT NULL DEFAULT 'hand' CHECK (source IN ('hand','session','block')),
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_time_spent_date ON time_spent(date);
CREATE INDEX IF NOT EXISTS idx_time_spent_thing ON time_spent(kind, ref_id, date);


CREATE TABLE IF NOT EXISTS rules (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  match_type            TEXT NOT NULL CHECK (match_type IN ('merchant','account','amount','keyword')),
  pattern               TEXT NOT NULL,
  set_category          TEXT,
  set_business_personal TEXT CHECK (set_business_personal IN ('business','personal','mixed')),
  priority              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS statement_templates (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name       TEXT NOT NULL,
  fingerprint       TEXT NOT NULL,
  file_type         TEXT NOT NULL CHECK (file_type IN ('csv','pdf')),
  field_map_json    TEXT NOT NULL DEFAULT '{}',
  sign_convention   TEXT,
  date_format       TEXT,
  target_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  confidence        REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);






















CREATE TABLE IF NOT EXISTS calendars (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1,

  kind         TEXT NOT NULL DEFAULT 'meeting',
  last_synced  TEXT,
  last_error   TEXT,
  event_count  INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0
);











CREATE TABLE IF NOT EXISTS periods (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  scale          TEXT NOT NULL,
  start_date     TEXT NOT NULL,

  theme          TEXT,

  intention      TEXT,

  keynote        TEXT,

  walking_from   TEXT,
  heading_toward TEXT,

  wins           TEXT,
  opened_at      TEXT,
  closed_at      TEXT,
  UNIQUE(scale, start_date)
);







CREATE TABLE IF NOT EXISTS libraries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  root_path  TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS statement_imports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT NOT NULL,
  source        TEXT NOT NULL,
  period_start  TEXT,
  period_end    TEXT,
  imported_at   TEXT NOT NULL,
  created_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0
);




















CREATE TABLE IF NOT EXISTS journal_dirty (date TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS journal_ledger (
  date    TEXT PRIMARY KEY,
  written TEXT NOT NULL,
  mtime   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS writing_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  field       TEXT NOT NULL,
  value       TEXT NOT NULL,
  replaced_at TEXT NOT NULL,
  source      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS library_marks (
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  rating     INTEGER,
  stage      TEXT,
  note       TEXT,
  updated_at TEXT,
  PRIMARY KEY (library_id, path)
);



CREATE TABLE IF NOT EXISTS library_tags (
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  tag        TEXT NOT NULL,
  PRIMARY KEY (library_id, path, tag)
);
CREATE INDEX IF NOT EXISTS idx_library_tags_tag ON library_tags(library_id, tag);




CREATE TABLE IF NOT EXISTS library_loops (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  name       TEXT NOT NULL,
  start_sec  REAL NOT NULL,
  end_sec    REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_library_loops_path ON library_loops(library_id, path);



CREATE TABLE IF NOT EXISTS library_media (
  library_id  INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  mtime       REAL NOT NULL,
  duration    REAL,
  format      TEXT,
  bitrate     INTEGER,
  sample_rate INTEGER,
  recorded    TEXT,
  title       TEXT,
  artist      TEXT,
  album       TEXT,
  year        INTEGER,
  bpm         INTEGER,
  musical_key TEXT,
  genre       TEXT,
  has_art     INTEGER NOT NULL DEFAULT 0,
  read_at     TEXT,
  PRIMARY KEY (library_id, path)
);



CREATE TABLE IF NOT EXISTS library_views (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  query      TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_library_views_lib ON library_views(library_id);



CREATE TABLE IF NOT EXISTS library_scenes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  layers     TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_library_scenes_lib ON library_scenes(library_id);




CREATE TABLE IF NOT EXISTS listening_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL,
  library_id INTEGER REFERENCES libraries(id) ON DELETE SET NULL,
  path       TEXT NOT NULL,
  name       TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'library',
  seconds    INTEGER NOT NULL DEFAULT 0,
  first_at   TEXT NOT NULL,
  UNIQUE (date, library_id, path, source)
);
CREATE INDEX IF NOT EXISTS idx_listening_date ON listening_log(date);



CREATE TABLE IF NOT EXISTS library_keynotes (
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  set_key    TEXT NOT NULL,
  path       TEXT NOT NULL,
  PRIMARY KEY (library_id, set_key)
);

CREATE TABLE IF NOT EXISTS library_covers (
  library_id  INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  folder_path TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  PRIMARY KEY (library_id, folder_path)
);

CREATE TABLE IF NOT EXISTS mirrors (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_date  TEXT NOT NULL,
  source_field TEXT NOT NULL DEFAULT 'noticing',
  quote        TEXT NOT NULL,
  prefix       TEXT NOT NULL DEFAULT '',
  suffix       TEXT NOT NULL DEFAULT '',
  target_kind  TEXT NOT NULL CHECK (target_kind IN ('vision', 'project', 'library')),
  target_id    INTEGER NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mirrors_source ON mirrors(source_date);
CREATE INDEX IF NOT EXISTS idx_mirrors_target ON mirrors(target_kind, target_id);










CREATE TABLE IF NOT EXISTS plan_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT NOT NULL,
  row_key     TEXT NOT NULL,
  category    TEXT,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  note        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_plan_items_dates ON plan_items(start_date, end_date);





CREATE TABLE IF NOT EXISTS plan_projections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  year         INTEGER NOT NULL,
  quarter      INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  label        TEXT NOT NULL,
  plan_item_id INTEGER REFERENCES plan_items(id) ON DELETE SET NULL,
  units        REAL NOT NULL DEFAULT 1,
  price        REAL NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notion_imports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  folder      TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  days        INTEGER NOT NULL DEFAULT 0,
  fields      INTEGER NOT NULL DEFAULT 0,
  todos       INTEGER NOT NULL DEFAULT 0,
  feelings    INTEGER NOT NULL DEFAULT 0,
  changes     TEXT NOT NULL DEFAULT '{}',
  undone_at   TEXT
);
`,v=`
CREATE INDEX IF NOT EXISTS idx_income_dedupe ON income_entries(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_expense_dedupe ON expense_entries(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_balance_dedupe ON balance_snapshots(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_biomarkers_dedupe ON biomarkers(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_feelings_date ON feeling_entries(date);
CREATE INDEX IF NOT EXISTS idx_feelings_family ON feeling_entries(family);






DROP TRIGGER IF EXISTS jd_daily_logs_ins;
CREATE TRIGGER jd_daily_logs_ins AFTER INSERT ON daily_logs BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); END;
DROP TRIGGER IF EXISTS jd_daily_logs_upd;
CREATE TRIGGER jd_daily_logs_upd AFTER UPDATE ON daily_logs BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_daily_logs_del;
CREATE TRIGGER jd_daily_logs_del AFTER DELETE ON daily_logs BEGIN INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_todos_ins;
CREATE TRIGGER jd_todos_ins AFTER INSERT ON todos BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); END;
DROP TRIGGER IF EXISTS jd_todos_upd;
CREATE TRIGGER jd_todos_upd AFTER UPDATE ON todos BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_todos_del;
CREATE TRIGGER jd_todos_del AFTER DELETE ON todos BEGIN INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_feeling_entries_ins;
CREATE TRIGGER jd_feeling_entries_ins AFTER INSERT ON feeling_entries BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); END;
DROP TRIGGER IF EXISTS jd_feeling_entries_upd;
CREATE TRIGGER jd_feeling_entries_upd AFTER UPDATE ON feeling_entries BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_feeling_entries_del;
CREATE TRIGGER jd_feeling_entries_del AFTER DELETE ON feeling_entries BEGIN INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_time_blocks_ins;
CREATE TRIGGER jd_time_blocks_ins AFTER INSERT ON time_blocks BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); END;
DROP TRIGGER IF EXISTS jd_time_blocks_upd;
CREATE TRIGGER jd_time_blocks_upd AFTER UPDATE ON time_blocks BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_time_blocks_del;
CREATE TRIGGER jd_time_blocks_del AFTER DELETE ON time_blocks BEGIN INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_protocol_logs_ins;
CREATE TRIGGER jd_protocol_logs_ins AFTER INSERT ON protocol_logs BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); END;
DROP TRIGGER IF EXISTS jd_protocol_logs_upd;
CREATE TRIGGER jd_protocol_logs_upd AFTER UPDATE ON protocol_logs BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_protocol_logs_del;
CREATE TRIGGER jd_protocol_logs_del AFTER DELETE ON protocol_logs BEGIN INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_practice_logs_ins;
CREATE TRIGGER jd_practice_logs_ins AFTER INSERT ON practice_logs BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); END;
DROP TRIGGER IF EXISTS jd_practice_logs_upd;
CREATE TRIGGER jd_practice_logs_upd AFTER UPDATE ON practice_logs BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_practice_logs_del;
CREATE TRIGGER jd_practice_logs_del AFTER DELETE ON practice_logs BEGIN INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_day_conditions_ins;
CREATE TRIGGER jd_day_conditions_ins AFTER INSERT ON day_conditions BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); END;
DROP TRIGGER IF EXISTS jd_day_conditions_upd;
CREATE TRIGGER jd_day_conditions_upd AFTER UPDATE ON day_conditions BEGIN INSERT INTO journal_dirty (date) SELECT NEW.date WHERE NEW.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = NEW.date); INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
DROP TRIGGER IF EXISTS jd_day_conditions_del;
CREATE TRIGGER jd_day_conditions_del AFTER DELETE ON day_conditions BEGIN INSERT INTO journal_dirty (date) SELECT OLD.date WHERE OLD.date IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_dirty WHERE date = OLD.date); END;
`,w=[{table:"vision_statements",from:"board_id",to:"domain_id"},{table:"aims",from:"board_id",to:"domain_id"}],H=[{table:"todos",column:"kind",def:"TEXT NOT NULL DEFAULT 'action'"},{table:"todos",column:"note",def:"TEXT"},{table:"todos",column:"note_of",def:"INTEGER"},{table:"todos",column:"source",def:"TEXT"},{table:"feeling_entries",column:"source",def:"TEXT"},{table:"vision_boards",column:"color",def:"TEXT"},{table:"time_blocks",column:"ticked",def:"INTEGER NOT NULL DEFAULT 0"},{table:"feeling_entries",column:"kind",def:"TEXT"},{table:"feeling_entries",column:"kind_by",def:"TEXT"},{table:"feeling_entries",column:"prompted",def:"INTEGER"},{table:"practices",column:"polarity",def:"TEXT NOT NULL DEFAULT 'do'"},{table:"practices",column:"started",def:"TEXT"},{table:"preset_blocks",column:"practice_id",def:"INTEGER REFERENCES practices(id) ON DELETE SET NULL"},{table:"content_ideas",column:"external_id",def:"TEXT"},{table:"content_ideas",column:"mark",def:"TEXT"},{table:"content_ideas",column:"drafted_text",def:"TEXT"},{table:"content_ideas",column:"drafted_body",def:"TEXT"},{table:"content_ideas",column:"domain_id",def:"INTEGER REFERENCES vision_boards(id) ON DELETE SET NULL"},{table:"content_ideas",column:"project_id",def:"INTEGER REFERENCES projects(id) ON DELETE SET NULL"},{table:"practices",column:"time_start",def:"TEXT"},{table:"practices",column:"time_end",def:"TEXT"},{table:"practices",column:"days",def:"TEXT"},{table:"health_protocols",column:"standing",def:"INTEGER NOT NULL DEFAULT 0"},{table:"projects",column:"library_id",def:"INTEGER"},{table:"projects",column:"notes",def:"TEXT"},{table:"libraries",column:"project_only",def:"INTEGER NOT NULL DEFAULT 0"},{table:"projects",column:"feed_url",def:"TEXT"},{table:"calendars",column:"named_by_user",def:"INTEGER NOT NULL DEFAULT 0"},{table:"todos",column:"block_id",def:"INTEGER REFERENCES time_blocks(id) ON DELETE SET NULL"},{table:"time_blocks",column:"practice_id",def:"INTEGER REFERENCES practices(id) ON DELETE SET NULL"},{table:"goals",column:"sort_order",def:"INTEGER NOT NULL DEFAULT 0"},{table:"vision_boards",column:"key_image",def:"TEXT"},{table:"vision_boards",column:"life_area",def:"TEXT"},{table:"vision_statements",column:"on_page",def:"TEXT"},{table:"vision_boards",column:"image_order_json",def:"TEXT"},{table:"projects",column:"key_image",def:"TEXT"},{table:"projects",column:"image_order_json",def:"TEXT"},{table:"todos",column:"due_date",def:"TEXT"},{table:"todos",column:"completed_on",def:"TEXT"},{table:"income_entries",column:"service_type",def:"TEXT"},{table:"income_entries",column:"source",def:"TEXT NOT NULL DEFAULT 'manual'"},{table:"income_entries",column:"dedupe_hash",def:"TEXT"},{table:"expense_entries",column:"service_type",def:"TEXT"},{table:"expense_entries",column:"merchant",def:"TEXT"},{table:"expense_entries",column:"is_transfer",def:"INTEGER NOT NULL DEFAULT 0"},{table:"expense_entries",column:"source",def:"TEXT NOT NULL DEFAULT 'manual'"},{table:"expense_entries",column:"dedupe_hash",def:"TEXT"},{table:"balance_snapshots",column:"source",def:"TEXT NOT NULL DEFAULT 'manual'"},{table:"balance_snapshots",column:"dedupe_hash",def:"TEXT"},{table:"aims",column:"metric",def:"TEXT"},{table:"vision_statements",column:"domain_id",def:"INTEGER"},{table:"todos",column:"start_time",def:"TEXT"},{table:"time_blocks",column:"domain_id",def:"INTEGER"},{table:"practices",column:"library_ref",def:"TEXT"},{table:"practices",column:"note",def:"TEXT"},{table:"time_blocks",column:"hidden",def:"INTEGER NOT NULL DEFAULT 0"},{table:"time_blocks",column:"cal_gone",def:"INTEGER NOT NULL DEFAULT 0"},{table:"time_blocks",column:"appointment",def:"INTEGER NOT NULL DEFAULT 0"},{table:"time_blocks",column:"cal_location",def:"TEXT"},{table:"time_blocks",column:"cal_links",def:"TEXT"},{table:"todos",column:"project_id",def:"INTEGER"},{table:"time_blocks",column:"project_id",def:"INTEGER"},{table:"daily_logs",column:"feelings",def:"TEXT"},{table:"daily_logs",column:"keynote",def:"TEXT"},{table:"todos",column:"weight",def:"TEXT NOT NULL DEFAULT 'should'"},{table:"vision_boards",column:"intent",def:"TEXT"},{table:"vision_boards",column:"notes",def:"TEXT"},{table:"vision_statements",column:"horizon",def:"TEXT"},{table:"aims",column:"domain_id",def:"INTEGER"},{table:"goals",column:"domain_id",def:"INTEGER"},{table:"goals",column:"tax_category",def:"TEXT"},{table:"goal_contributions",column:"expected_date",def:"TEXT"},{table:"goal_contributions",column:"note",def:"TEXT"},{table:"protocol_items",column:"options_json",def:"TEXT"},{table:"protocol_logs",column:"text",def:"TEXT"},{table:"practices",column:"minutes_target",def:"INTEGER"},{table:"practice_logs",column:"minutes",def:"INTEGER"},{table:"practices",column:"domain_id",def:"INTEGER REFERENCES vision_boards(id) ON DELETE SET NULL"},{table:"projects",column:"stage",def:"TEXT"},{table:"content_ideas",column:"body",def:"TEXT"},{table:"content_ideas",column:"key_image",def:"TEXT"},{table:"content_ideas",column:"image_order_json",def:"TEXT"},{table:"content_ideas",column:"parent_id",def:"INTEGER REFERENCES content_ideas(id) ON DELETE SET NULL"},{table:"kpis",column:"sort_order",def:"INTEGER NOT NULL DEFAULT 0"},{table:"kpis",column:"domain_id",def:"INTEGER"},{table:"kpis",column:"note",def:"TEXT"},{table:"aims",column:"note",def:"TEXT"},{table:"projects",column:"start_date",def:"TEXT"},{table:"projects",column:"due_date",def:"TEXT"},...["vision_boards","projects"].flatMap(E=>[{table:E,column:"cosmos_url",def:"TEXT"},{table:E,column:"cosmos_name",def:"TEXT"},{table:E,column:"cosmos_items_json",def:"TEXT"},{table:E,column:"cosmos_hidden_json",def:"TEXT"},{table:E,column:"cosmos_synced_at",def:"TEXT"},{table:E,column:"cosmos_error",def:"TEXT"}])],K=`
CREATE TABLE protocol_items_new (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol_id  INTEGER NOT NULL REFERENCES health_protocols(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('symptom','adherence','bristol','eating')),
  label        TEXT NOT NULL,
  options_json TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
INSERT INTO protocol_items_new (id, protocol_id, kind, label, options_json, sort_order)
  SELECT id, protocol_id, kind, label, options_json, sort_order FROM protocol_items;
DROP TABLE protocol_items;
ALTER TABLE protocol_items_new RENAME TO protocol_items;
CREATE INDEX IF NOT EXISTS idx_protocol_items ON protocol_items(protocol_id);
`,$=`
CREATE TABLE content_ideas_new (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  state      TEXT NOT NULL DEFAULT 'concept' CHECK (state IN ('concept','queued','ready','shipped')),
  pillar     TEXT,
  medium     TEXT,
  source     TEXT,
  note       TEXT,
  created_at TEXT NOT NULL,
  shipped_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
INSERT INTO content_ideas_new (id, text, state, pillar, medium, source, note, created_at, shipped_at, sort_order)
  SELECT id, text, state, pillar, NULL, source, note, created_at, shipped_at, sort_order FROM content_ideas;
DROP TABLE content_ideas;
ALTER TABLE content_ideas_new RENAME TO content_ideas;
CREATE INDEX IF NOT EXISTS idx_content_ideas_state ON content_ideas(state, sort_order);
`,q=E=>String(E).replace(/^file:\/\//,"")||"/device/server/index.ts";var A={};const h=L(q(import.meta.url)),u=n(h,"../.data-home");function Q(){if(!c(u))return n(h,"../data");const E=k(u,"utf8").trim();if(!X(E))throw new Error(`.data-home should hold a full path, and holds "${E}".`);if(!c(E)||!A.BECOMING_DB&&!c(S(E,"being-sound.db")))throw new Error(`Becoming's data is not where .data-home says: ${E}
Is the disk it lives on connected? The app will not start a new, empty database in its place.`);return E}const z=globalThis.__becomingDevice?"/data":A.BECOMING_DB?L(n(A.BECOMING_DB)):Q();var C={};const M=C.BECOMING_DB?n(C.BECOMING_DB):n(z,"being-sound.db");j(L(M));const t=new B(M);t.pragma("foreign_keys = ON");t.exec(g);for(const E of w){const e=t.prepare(`PRAGMA table_info(${E.table})`).all(),T=e.some(N=>N.name===E.from),a=e.some(N=>N.name===E.to);T&&!a&&(t.exec(`ALTER TABLE ${E.table} RENAME COLUMN ${E.from} TO ${E.to}`),console.log(`↻ renamed ${E.table}.${E.from} → ${E.to}`))}for(const E of H)t.prepare(`PRAGMA table_info(${E.table})`).all().some(T=>T.name===E.column)||t.exec(`ALTER TABLE ${E.table} ADD COLUMN ${E.column} ${E.def}`);if(!t.prepare("SELECT value FROM settings WHERE key = 'statements_on_page'").get()){const e=t.prepare("SELECT id, notes FROM vision_boards").all(),T=t.prepare("SELECT id, label, text FROM vision_statements WHERE domain_id = ? AND on_page IS NULL ORDER BY sort_order, id"),a=t.prepare("UPDATE vision_boards SET notes = ? WHERE id = ?"),N=t.prepare("UPDATE vision_statements SET on_page = ? WHERE id = ?"),i=new Date().toISOString();t.transaction(()=>{for(const o of e){const l=T.all(o.id).slice(1).filter(s=>s.text.trim());if(!l.length)continue;const U=l.map(s=>s.label?.trim()?`## ${s.label.trim()}

${s.text.trim()}`:s.text.trim()).join(`

`),p=(o.notes??"").trimEnd();a.run(p?`${p}

${U}`:U,o.id);for(const s of l)N.run(i,s.id)}t.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('statements_on_page', ?)").run(JSON.stringify(i))})()}if(!t.prepare("SELECT value FROM settings WHERE key = 'guides_moved'").get()){const e=t.prepare("SELECT * FROM feeling_supports ORDER BY sort_order, id").all();t.transaction(()=>{const T=t.prepare("INSERT INTO guides (title, url, library_id, path, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)"),a=t.prepare("INSERT OR IGNORE INTO guide_links (guide_id, kind, key) VALUES (?, ?, ?)");for(const N of e){const[i,...o]=(N.library_ref??"").split("/"),_=T.run(N.label,N.url,N.library_ref&&Number(i)?Number(i):null,N.library_ref&&o.length?o.join("/"):null,N.sort_order,N.created_at??new Date().toISOString()).lastInsertRowid;a.run(_,N.scope==="family"?"family":"feeling",N.match_key)}t.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('guides_moved', ?)").run(JSON.stringify(new Date().toISOString()))})()}const D=t.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='check_ins'").get()?.sql;D&&!D.includes("'looking'")&&t.exec(`
    BEGIN;
    ALTER TABLE check_ins RENAME TO check_ins_old;
    CREATE TABLE check_ins (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      type         TEXT NOT NULL CHECK (type IN ('weekly','monthly','quarterly','yearly','money_date','question','looking')),
      date         TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}'
    );
    INSERT INTO check_ins (id, type, date, payload_json)
      SELECT id, type, date, payload_json FROM check_ins_old;
    DROP TABLE check_ins_old;
    CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(date);
    CREATE INDEX IF NOT EXISTS idx_check_ins_type ON check_ins(type, date);
    COMMIT;
  `);const F=t.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='practices'").get()?.sql;F&&!F.includes("lane")&&(t.exec("DROP TABLE IF EXISTS practice_logs; DROP TABLE IF EXISTS practices;"),t.exec(g));{const E=t.prepare("SELECT COUNT(*) AS n FROM vision_boards").get().n,e=t.prepare("SELECT COUNT(*) AS n FROM vision_statements WHERE domain_id IS NULL").get().n;if(E===0&&e>0){const a=t.prepare("SELECT value FROM settings WHERE key='vision_cosmos_links'").get()?.value??"[]",N=t.prepare("INSERT INTO vision_boards (name, links_json, sort_order) VALUES ('My vision', ?, 0)").run(a).lastInsertRowid;t.prepare("UPDATE vision_statements SET domain_id = ? WHERE domain_id IS NULL").run(N)}}{const E=t.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'protocol_items'").get()?.sql??"";E&&!E.includes("'eating'")&&(t.exec("PRAGMA foreign_keys = OFF"),t.transaction(()=>t.exec(K))(),t.exec("PRAGMA foreign_keys = ON"))}if(t.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('content_ideas') WHERE name = 'pillar'").get().n>0){const e=t.prepare(`INSERT OR IGNORE INTO content_idea_tags (idea_id, tag)
       SELECT id, TRIM(pillar) FROM content_ideas WHERE TRIM(COALESCE(pillar, '')) <> ''`).run().changes;e>0&&console.log(`  content: ${e} pillar${e===1?"":"s"} carried across as tags`)}{const E=t.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'content_ideas'").get()?.sql??"";E&&!E.includes("'ready'")&&(t.exec("PRAGMA foreign_keys = OFF"),t.transaction(()=>t.exec($))(),t.exec("PRAGMA foreign_keys = ON"))}{const E=t.prepare("UPDATE protocol_items SET kind = 'eating' WHERE kind = 'adherence'").run().changes;E>0&&console.log(`  diet: ${E} item${E===1?"":"s"} moved from the old scale to what you ate`)}if(t.prepare("SELECT COUNT(*) AS n FROM time_spent WHERE kind = 'practice'").get().n===0){const e=t.prepare(`INSERT INTO time_spent (date, kind, ref_id, minutes, source, created_at)
         SELECT date, 'practice', practice_id, minutes, 'hand', NULL
           FROM practice_logs WHERE minutes IS NOT NULL AND minutes > 0`).run().changes;e&&console.log(`   carried ${e} timed day${e===1?"":"s"} into the one place time is kept`)}t.exec(v);{const E=t.prepare(`UPDATE todos SET block_id = NULL
      WHERE block_id IS NOT NULL
        AND (block_id NOT IN (SELECT id FROM time_blocks)
             OR block_id IN (SELECT id FROM time_blocks WHERE hidden = 1))`).run().changes;E&&console.log(`   brought ${E} written line${E===1?"":"s"} out of hours that are gone, into their days`)}function Z(E,e){const T=t.prepare("SELECT value FROM settings WHERE key = ?").get(E);if(!T)return e;try{return JSON.parse(T.value)}catch{return e}}function EE(E,e){t.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(E,JSON.stringify(e))}function eE(){const E=t.prepare("SELECT key, value FROM settings").all(),e={};for(const T of E)try{e[T.key]=JSON.parse(T.value)}catch{e[T.key]=T.value}return e}export{z as D,M as a,L as b,R as c,t as d,eE as e,q as f,Z as g,I as h,S as j,J as p,n as r,EE as s};
