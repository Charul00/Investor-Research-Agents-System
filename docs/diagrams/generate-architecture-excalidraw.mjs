import { writeFileSync } from "node:fs";

const outFile = new URL("./klypup-architecture.excalidraw", import.meta.url);

let counter = 0;

function id(prefix) {
  counter += 1;
  return `${prefix}_${counter}`;
}

function base(type, x, y, width, height, extra = {}) {
  return {
    id: id(type),
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: extra.strokeColor ?? "#0f172a",
    backgroundColor: extra.backgroundColor ?? "transparent",
    fillStyle: "solid",
    strokeWidth: extra.strokeWidth ?? 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: extra.frameId ?? null,
    index: `a${counter}`,
    roundness: extra.roundness ?? { type: 3 },
    seed: counter * 101,
    version: 1,
    versionNonce: counter * 1009,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    customData: undefined,
    ...extra,
  };
}

function frame(x, y, width, height, name) {
  return base("frame", x, y, width, height, {
    name,
    strokeColor: "#94a3b8",
    backgroundColor: "#f8fafc",
  });
}

function rect(x, y, width, height, label, options = {}) {
  const element = base("rectangle", x, y, width, height, {
    strokeColor: options.strokeColor ?? "#0f766e",
    backgroundColor: options.backgroundColor ?? "#ecfdf5",
    frameId: options.frameId,
  });
  return [element, text(x + 16, y + 16, width - 32, label, options)];
}

function table(x, y, width, title, rows, options = {}) {
  const rowHeight = 28;
  const height = 48 + rows.length * rowHeight;
  const elements = [
    base("rectangle", x, y, width, height, {
      strokeColor: options.strokeColor ?? "#0f766e",
      backgroundColor: options.backgroundColor ?? "#ffffff",
      frameId: options.frameId,
    }),
    base("rectangle", x, y, width, 44, {
      strokeColor: options.strokeColor ?? "#0f766e",
      backgroundColor: options.headerColor ?? "#0f766e",
      frameId: options.frameId,
    }),
    text(x + 14, y + 12, width - 28, title, {
      frameId: options.frameId,
      fontSize: 20,
      color: "#ffffff",
      fontWeight: "bold",
    }),
  ];

  rows.forEach((row, index) => {
    elements.push(
      text(x + 14, y + 52 + index * rowHeight, width - 28, row, {
        frameId: options.frameId,
        fontSize: 14,
        color: "#334155",
      }),
    );
  });
  return elements;
}

function diamond(x, y, width, height, label, options = {}) {
  const element = base("diamond", x, y, width, height, {
    strokeColor: options.strokeColor ?? "#b45309",
    backgroundColor: options.backgroundColor ?? "#fffbeb",
    frameId: options.frameId,
  });
  return [element, text(x + 24, y + height / 2 - 18, width - 48, label, options)];
}

function ellipse(x, y, width, height, label, options = {}) {
  const element = base("ellipse", x, y, width, height, {
    strokeColor: options.strokeColor ?? "#2563eb",
    backgroundColor: options.backgroundColor ?? "#eff6ff",
    frameId: options.frameId,
  });
  return [element, text(x + 18, y + height / 2 - 18, width - 36, label, options)];
}

function text(x, y, width, value, options = {}) {
  const fontSize = options.fontSize ?? 16;
  const lines = String(value).split("\n");
  return base("text", x, y, width, Math.max(24, lines.length * fontSize * 1.35), {
    strokeColor: options.color ?? "#0f172a",
    backgroundColor: "transparent",
    frameId: options.frameId,
    text: value,
    fontSize,
    fontFamily: 1,
    textAlign: options.align ?? "center",
    verticalAlign: "middle",
    baseline: Math.max(18, lines.length * fontSize),
    containerId: null,
    originalText: value,
    lineHeight: 1.25,
  });
}

function arrow(x1, y1, x2, y2, label, options = {}) {
  const element = base("arrow", x1, y1, x2 - x1, y2 - y1, {
    strokeColor: options.strokeColor ?? "#334155",
    backgroundColor: "transparent",
    frameId: options.frameId,
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    roundness: { type: 2 },
  });
  if (!label) {
    return [element];
  }
  return [
    element,
    text((x1 + x2) / 2 - 100, (y1 + y2) / 2 - 28, 200, label, {
      frameId: options.frameId,
      fontSize: 13,
      color: options.labelColor ?? "#475569",
    }),
  ];
}

const elements = [];

function add(...items) {
  elements.push(...items.flat());
}

const system = frame(0, 0, 1700, 900, "1. System Architecture");
add(system);
add(text(40, 35, 700, "System Architecture: Klypup Research OS", {
  frameId: system.id,
  fontSize: 30,
  align: "left",
  color: "#0f172a",
}));
add(...rect(60, 150, 220, 90, "Analyst / Admin\nBrowser user", { frameId: system.id, backgroundColor: "#eef2ff", strokeColor: "#4f46e5" }));
add(...rect(360, 120, 280, 150, "Next.js Frontend\nVercel\nProtected routes\nStructured UI", { frameId: system.id, backgroundColor: "#f0fdfa" }));
add(...rect(730, 110, 300, 170, "FastAPI Backend\nRender\nREST endpoints\nValidation + errors", { frameId: system.id, backgroundColor: "#ecfdf5" }));
add(...rect(1120, 110, 270, 170, "Auth + Tenant Layer\nJWT validation\nX-Organization-Id\nRBAC dependencies", { frameId: system.id, backgroundColor: "#fff7ed", strokeColor: "#f97316" }));
add(...rect(1450, 130, 200, 130, "PostgreSQL\nRender DB\nTenant-scoped rows", { frameId: system.id, backgroundColor: "#eff6ff", strokeColor: "#2563eb" }));
add(...rect(720, 390, 320, 150, "Research Orchestrator\nPlanner\nParallel tools\nStructured response", { frameId: system.id, backgroundColor: "#f0fdf4", strokeColor: "#16a34a" }));
add(...rect(60, 610, 250, 120, "OpenAI\nPlanner + synthesis\nSource-grounded summary", { frameId: system.id, backgroundColor: "#f8fafc", strokeColor: "#64748b" }));
add(...rect(380, 610, 250, 120, "Market APIs\nTwelve Data\nAlpha Vantage\nFallback providers", { frameId: system.id, backgroundColor: "#ecfeff", strokeColor: "#0891b2" }));
add(...rect(700, 610, 250, 120, "News Tool\nYahoo Finance RSS\nRecency + sentiment", { frameId: system.id, backgroundColor: "#fefce8", strokeColor: "#ca8a04" }));
add(...rect(1020, 610, 250, 120, "Document KB\nQdrant vectors\nLocal RAG fallback", { frameId: system.id, backgroundColor: "#fdf2f8", strokeColor: "#db2777" }));
add(...rect(1340, 610, 250, 120, "Cache + Filings\nUpstash Redis\nSEC EDGAR", { frameId: system.id, backgroundColor: "#f5f3ff", strokeColor: "#7c3aed" }));
add(...arrow(280, 195, 360, 195, "uses app", { frameId: system.id }));
add(...arrow(640, 195, 730, 195, "HTTPS + JWT", { frameId: system.id }));
add(...arrow(1030, 195, 1120, 195, "dependencies", { frameId: system.id }));
add(...arrow(1390, 195, 1450, 195, "scoped SQL", { frameId: system.id }));
add(...arrow(880, 280, 880, 390, "POST /research", { frameId: system.id }));
add(...arrow(720, 465, 310, 650, "plan/synthesize", { frameId: system.id }));
add(...arrow(820, 540, 505, 610, "quotes/history", { frameId: system.id }));
add(...arrow(880, 540, 825, 610, "headlines", { frameId: system.id }));
add(...arrow(940, 540, 1145, 610, "semantic search", { frameId: system.id }));
add(...arrow(1015, 505, 1465, 610, "cache + SEC facts", { frameId: system.id }));
add(...arrow(720, 440, 640, 230, "JSON result", { frameId: system.id }));

const flow = frame(0, 980, 1700, 900, "2. Research Data Flow");
add(flow);
add(text(40, 1015, 820, "Data Flow: UI input to rendered source-attributed report", {
  frameId: flow.id,
  fontSize: 30,
  align: "left",
}));
const flowBoxes = [
  [60, 1120, "1. User enters\nresearch query"],
  [330, 1120, "2. Frontend sends\nPOST /api/v1/research\nJWT + org header"],
  [660, 1120, "3. Auth dependency\nvalidates user + active\nmembership"],
  [1010, 1120, "4. AI planner selects\nmarket/news/docs"],
  [60, 1410, "5. Selected tools fetch\nexternal evidence\nin parallel"],
  [390, 1410, "6. OpenAI synthesis\nuses evidence only"],
  [720, 1410, "7. Backend returns\nResearchResponse JSON"],
  [1050, 1410, "8. UI renders cards,\ncharts, badges, sources"],
  [1370, 1410, "9. User saves report\nDB insert + audit log"],
];
flowBoxes.forEach(([x, y, label], index) => {
  add(...rect(x, y, index === 1 || index === 2 ? 260 : 230, 125, label, {
    frameId: flow.id,
    backgroundColor: index < 4 ? "#ecfdf5" : "#f8fafc",
  }));
});
add(...arrow(290, 1182, 330, 1182, null, { frameId: flow.id }));
add(...arrow(590, 1182, 660, 1182, null, { frameId: flow.id }));
add(...arrow(920, 1182, 1010, 1182, null, { frameId: flow.id }));
add(...arrow(1125, 1245, 175, 1410, "tool execution", { frameId: flow.id }));
add(...arrow(290, 1472, 390, 1472, null, { frameId: flow.id }));
add(...arrow(620, 1472, 720, 1472, null, { frameId: flow.id }));
add(...arrow(950, 1472, 1050, 1472, null, { frameId: flow.id }));
add(...arrow(1280, 1472, 1370, 1472, null, { frameId: flow.id }));
add(...rect(1300, 1110, 310, 150, "Tenant safety checkpoint\nNo route can read/write\nreports or watchlists\nwithout membership context.", {
  frameId: flow.id,
  backgroundColor: "#fff7ed",
  strokeColor: "#f97316",
}));

const erd = frame(0, 1960, 1700, 1100, "3. Database ER Diagram");
add(erd);
add(text(40, 1995, 780, "Database Schema / ERD", { frameId: erd.id, fontSize: 30, align: "left" }));
add(...table(60, 2080, 300, "users", ["id PK", "full_name", "email UNIQUE INDEX", "password_hash", "is_active", "created_at / updated_at"], { frameId: erd.id, headerColor: "#0f766e" }));
add(...table(500, 2080, 340, "organizations", ["id PK", "name", "slug UNIQUE INDEX", "created_by_user_id FK", "created_at / updated_at"], { frameId: erd.id, headerColor: "#0f766e" }));
add(...table(980, 2080, 360, "memberships", ["id PK", "organization_id FK INDEX", "user_id FK INDEX", "role: admin | analyst", "status: active | disabled", "UNIQUE organization_id + user_id"], { frameId: erd.id, headerColor: "#ea580c" }));
add(...table(60, 2480, 360, "reports", ["id PK", "organization_id FK INDEX", "author_id FK INDEX", "title", "query_text", "summary", "status", "tags JSON"], { frameId: erd.id, headerColor: "#2563eb" }));
add(...table(500, 2480, 360, "watchlist_items", ["id PK", "organization_id FK INDEX", "added_by_user_id FK", "symbol INDEX", "company_name", "notes", "UNIQUE organization_id + symbol"], { frameId: erd.id, headerColor: "#2563eb" }));
add(...table(940, 2480, 330, "invites", ["id PK", "organization_id FK", "created_by_user_id FK", "code UNIQUE", "role", "email", "status", "expires_at"], { frameId: erd.id, headerColor: "#7c3aed" }));
add(...table(1320, 2480, 320, "audit_logs", ["id PK", "organization_id FK INDEX", "actor_user_id FK", "action", "entity_type", "entity_id", "payload JSON"], { frameId: erd.id, headerColor: "#7c3aed" }));
add(...arrow(360, 2195, 980, 2195, "users 1:N memberships", { frameId: erd.id }));
add(...arrow(840, 2195, 980, 2195, "orgs 1:N memberships", { frameId: erd.id }));
add(...arrow(670, 2300, 240, 2480, "org owns reports", { frameId: erd.id }));
add(...arrow(670, 2300, 680, 2480, "org owns watchlist", { frameId: erd.id }));
add(...arrow(670, 2300, 1105, 2480, "org owns invites", { frameId: erd.id }));
add(...arrow(840, 2240, 1480, 2480, "org owns audit logs", { frameId: erd.id }));
add(...arrow(210, 2300, 240, 2480, "author", { frameId: erd.id }));
add(...arrow(210, 2300, 680, 2480, "added by", { frameId: erd.id }));

const ai = frame(0, 3160, 1700, 920, "4. AI Orchestration Flow");
add(ai);
add(text(40, 3195, 820, "AI Orchestration: dynamic tool planning and structured output", {
  frameId: ai.id,
  fontSize: 30,
  align: "left",
}));
add(...rect(60, 3320, 230, 100, "Research query\nnatural language", { frameId: ai.id, backgroundColor: "#eef2ff", strokeColor: "#4f46e5" }));
add(...rect(360, 3320, 250, 100, "Extract symbols\nand user intent", { frameId: ai.id }));
add(...rect(680, 3320, 270, 100, "Deterministic planner\nguardrails", { frameId: ai.id }));
add(...rect(1020, 3320, 250, 100, "OpenAI planner\nJSON tool plan", { frameId: ai.id, backgroundColor: "#f8fafc", strokeColor: "#64748b" }));
add(...diamond(1350, 3300, 260, 140, "Selected tools?", { frameId: ai.id }));
add(...rect(150, 3580, 260, 110, "Market data tool\nquotes, volume,\nmetrics, history", { frameId: ai.id, backgroundColor: "#ecfeff", strokeColor: "#0891b2" }));
add(...rect(510, 3580, 260, 110, "News sentiment tool\nrecent headlines\npositive/neutral/negative", { frameId: ai.id, backgroundColor: "#fefce8", strokeColor: "#ca8a04" }));
add(...rect(870, 3580, 260, 110, "Document KB tool\nQdrant + local RAG\nSEC companyfacts", { frameId: ai.id, backgroundColor: "#fdf2f8", strokeColor: "#db2777" }));
add(...rect(1230, 3580, 260, 110, "Cache layer\nUpstash Redis\nTTL by tool type", { frameId: ai.id, backgroundColor: "#f5f3ff", strokeColor: "#7c3aed" }));
add(...rect(360, 3840, 300, 105, "Aggregate evidence\nnormalize sources\nattach source IDs", { frameId: ai.id }));
add(...rect(760, 3840, 300, 105, "Deterministic insights\nconfidence + sections", { frameId: ai.id }));
add(...rect(1160, 3840, 300, 105, "OpenAI synthesis\nplain English\nno markdown artifacts", { frameId: ai.id, backgroundColor: "#f8fafc", strokeColor: "#64748b" }));
add(...rect(650, 4000, 360, 90, "Structured ResearchResponse\ncompanies, news, documents,\ninsights, sources", { frameId: ai.id, backgroundColor: "#ecfdf5", strokeColor: "#0f766e" }));
add(...arrow(290, 3370, 360, 3370, null, { frameId: ai.id }));
add(...arrow(610, 3370, 680, 3370, null, { frameId: ai.id }));
add(...arrow(950, 3370, 1020, 3370, null, { frameId: ai.id }));
add(...arrow(1270, 3370, 1350, 3370, null, { frameId: ai.id }));
add(...arrow(1430, 3440, 280, 3580, "market_data", { frameId: ai.id }));
add(...arrow(1460, 3440, 640, 3580, "news_sentiment", { frameId: ai.id }));
add(...arrow(1490, 3440, 1000, 3580, "document_kb", { frameId: ai.id }));
add(...arrow(1520, 3440, 1360, 3580, "cache first", { frameId: ai.id }));
add(...arrow(280, 3690, 510, 3840, null, { frameId: ai.id }));
add(...arrow(640, 3690, 590, 3840, null, { frameId: ai.id }));
add(...arrow(1000, 3690, 630, 3840, null, { frameId: ai.id }));
add(...arrow(1360, 3690, 660, 3840, null, { frameId: ai.id }));
add(...arrow(660, 3895, 760, 3895, null, { frameId: ai.id }));
add(...arrow(1060, 3895, 1160, 3895, null, { frameId: ai.id }));
add(...arrow(910, 3945, 830, 4000, null, { frameId: ai.id }));
add(...arrow(1310, 3945, 920, 4000, null, { frameId: ai.id }));

const tenant = frame(0, 4180, 1700, 920, "5. Multi-Tenant Isolation Flow");
add(tenant);
add(text(40, 4215, 780, "Multi-Tenant Data Flow: Org A never sees Org B data", {
  frameId: tenant.id,
  fontSize: 30,
  align: "left",
}));
add(...ellipse(60, 4340, 220, 100, "User in Org A", { frameId: tenant.id, backgroundColor: "#ecfdf5", strokeColor: "#0f766e" }));
add(...ellipse(60, 4560, 220, 100, "User in Org B", { frameId: tenant.id, backgroundColor: "#eff6ff", strokeColor: "#2563eb" }));
add(...rect(370, 4330, 300, 120, "API Request\nAuthorization: Bearer JWT\nX-Organization-Id: Org A", { frameId: tenant.id, backgroundColor: "#f8fafc", strokeColor: "#334155" }));
add(...rect(370, 4550, 300, 120, "API Request\nAuthorization: Bearer JWT\nX-Organization-Id: Org B", { frameId: tenant.id, backgroundColor: "#f8fafc", strokeColor: "#334155" }));
add(...rect(760, 4430, 300, 150, "get_current_membership\n1. decode JWT\n2. load user\n3. verify active membership\nfor requested org", { frameId: tenant.id, backgroundColor: "#fff7ed", strokeColor: "#f97316" }));
add(...diamond(1130, 4435, 260, 140, "Membership\nexists?", { frameId: tenant.id, backgroundColor: "#fffbeb", strokeColor: "#ca8a04" }));
add(...rect(1460, 4340, 190, 110, "Allow\nroute receives\nmembership context", { frameId: tenant.id, backgroundColor: "#ecfdf5", strokeColor: "#0f766e" }));
add(...rect(1460, 4580, 190, 110, "Deny\n403 tenant_access_denied", { frameId: tenant.id, backgroundColor: "#fef2f2", strokeColor: "#dc2626" }));
add(...rect(340, 4820, 420, 120, "Scoped SQL\nWHERE organization_id = membership.organization_id\napplied to dashboard, reports, watchlist, audit logs", { frameId: tenant.id, backgroundColor: "#f8fafc", strokeColor: "#334155" }));
add(...rect(880, 4820, 300, 120, "Org A rows\nreports\nwatchlist\naudit logs", { frameId: tenant.id, backgroundColor: "#ecfdf5", strokeColor: "#0f766e" }));
add(...rect(1280, 4820, 300, 120, "Org B rows\nreports\nwatchlist\naudit logs", { frameId: tenant.id, backgroundColor: "#eff6ff", strokeColor: "#2563eb" }));
add(...arrow(280, 4390, 370, 4390, null, { frameId: tenant.id }));
add(...arrow(280, 4610, 370, 4610, null, { frameId: tenant.id }));
add(...arrow(670, 4390, 760, 4480, null, { frameId: tenant.id }));
add(...arrow(670, 4610, 760, 4510, null, { frameId: tenant.id }));
add(...arrow(1060, 4505, 1130, 4505, null, { frameId: tenant.id }));
add(...arrow(1390, 4480, 1460, 4395, "yes", { frameId: tenant.id }));
add(...arrow(1390, 4545, 1460, 4635, "no", { frameId: tenant.id }));
add(...arrow(1555, 4450, 550, 4820, "authorized only", { frameId: tenant.id }));
add(...arrow(760, 4880, 880, 4880, "Org A context", { frameId: tenant.id }));
add(...arrow(760, 4910, 1280, 4910, "Org B context", { frameId: tenant.id }));
add(...arrow(1030, 4820, 1430, 4820, "no cross-tenant join", { frameId: tenant.id, strokeColor: "#dc2626" }));

const scene = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: {
    gridSize: 20,
    viewBackgroundColor: "#f8fafc",
    currentItemFontFamily: 1,
    currentItemFontSize: 18,
    currentItemStrokeColor: "#0f172a",
    currentItemBackgroundColor: "transparent",
  },
  files: {},
};

writeFileSync(outFile, `${JSON.stringify(scene, null, 2)}\n`);
console.log(`Wrote ${outFile.pathname}`);
