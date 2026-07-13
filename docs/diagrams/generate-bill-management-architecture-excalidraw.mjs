import { writeFileSync } from "node:fs";

const outFile = new URL("./bill-management-app-architecture.excalidraw", import.meta.url);

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

function rect(x, y, width, height, label, options = {}) {
  const element = base("rectangle", x, y, width, height, {
    strokeColor: options.strokeColor ?? "#0f766e",
    backgroundColor: options.backgroundColor ?? "#ecfdf5",
    frameId: options.frameId,
  });
  return [element, text(x + 16, y + 16, width - 32, label, options)];
}

function diamond(x, y, width, height, label, options = {}) {
  const element = base("diamond", x, y, width, height, {
    strokeColor: options.strokeColor ?? "#b45309",
    backgroundColor: options.backgroundColor ?? "#fffbeb",
    frameId: options.frameId,
  });
  return [element, text(x + 24, y + height / 2 - 18, width - 48, label, options)];
}

function table(x, y, width, title, rows, options = {}) {
  const rowHeight = 26;
  const height = 46 + rows.length * rowHeight;
  const elements = [
    base("rectangle", x, y, width, height, {
      strokeColor: options.strokeColor ?? "#0f766e",
      backgroundColor: options.backgroundColor ?? "#ffffff",
      frameId: options.frameId,
    }),
    base("rectangle", x, y, width, 42, {
      strokeColor: options.strokeColor ?? "#0f766e",
      backgroundColor: options.headerColor ?? "#0f766e",
      frameId: options.frameId,
    }),
    text(x + 14, y + 10, width - 28, title, {
      frameId: options.frameId,
      fontSize: 18,
      color: "#ffffff",
      fontWeight: "bold",
    }),
  ];

  rows.forEach((row, index) => {
    elements.push(
      text(x + 14, y + 48 + index * rowHeight, width - 28, row, {
        frameId: options.frameId,
        fontSize: 13,
        color: "#334155",
      }),
    );
  });
  return elements;
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
    text((x1 + x2) / 2 - 105, (y1 + y2) / 2 - 24, 210, label, {
      frameId: options.frameId,
      fontSize: 12,
      color: options.labelColor ?? "#475569",
    }),
  ];
}

const elements = [];

function add(...items) {
  elements.push(...items.flat());
}

const system = frame(0, 0, 1820, 940, "1. System Architecture");
add(system);
add(text(40, 35, 900, "System Architecture: consumer subscription and bill management app", {
  frameId: system.id,
  fontSize: 30,
  align: "left",
}));
add(...rect(70, 150, 210, 100, "Consumer user\niPhone / Android", {
  frameId: system.id,
  backgroundColor: "#eef2ff",
  strokeColor: "#4f46e5",
}));
add(...rect(350, 120, 280, 170, "FlutterFlow mobile app\nOnboarding\nBills dashboard\nTrust center\nReminder settings", {
  frameId: system.id,
  backgroundColor: "#f0fdfa",
}));
add(...rect(700, 90, 250, 120, "Firebase Auth\nApp login\nSession state", {
  frameId: system.id,
  backgroundColor: "#fff7ed",
  strokeColor: "#f97316",
}));
add(...rect(700, 250, 250, 120, "Cloud Firestore\nUsers\nConnections\nBills\nReminders\nAudit", {
  frameId: system.id,
  backgroundColor: "#eff6ff",
  strokeColor: "#2563eb",
}));
add(...rect(1010, 100, 320, 220, "Cloud Functions\nOAuth callbacks\nInbox sync\nAI parse\nReminder jobs\nStripe webhooks\nToken revocation", {
  frameId: system.id,
  backgroundColor: "#ecfdf5",
  strokeColor: "#16a34a",
}));
add(...rect(1390, 100, 280, 120, "Secrets / encrypted token layer\nOAuth client secrets\nEncrypted refresh token blobs", {
  frameId: system.id,
  backgroundColor: "#f5f3ff",
  strokeColor: "#7c3aed",
}));
add(...rect(1390, 260, 280, 100, "Scheduled Functions\n15-30 min sync\nReminder dispatch", {
  frameId: system.id,
  backgroundColor: "#fefce8",
  strokeColor: "#ca8a04",
}));
add(...rect(160, 490, 240, 130, "Gmail API\nRestricted read scope\nIncremental mailbox scan", {
  frameId: system.id,
  backgroundColor: "#fef2f2",
  strokeColor: "#dc2626",
}));
add(...rect(470, 490, 240, 130, "Microsoft Graph\nMail.Read\nDelta sync", {
  frameId: system.id,
  backgroundColor: "#eff6ff",
  strokeColor: "#2563eb",
}));
add(...rect(780, 490, 250, 130, "AI parser service\nStructured JSON output\nConfidence scoring", {
  frameId: system.id,
  backgroundColor: "#fdf2f8",
  strokeColor: "#db2777",
}));
add(...rect(1100, 490, 220, 130, "Stripe\nCustomer / subscription\nWebhook events", {
  frameId: system.id,
  backgroundColor: "#ecfeff",
  strokeColor: "#0891b2",
}));
add(...rect(1390, 490, 220, 130, "Resend\nReminder emails\nDelivery status", {
  frameId: system.id,
  backgroundColor: "#f8fafc",
  strokeColor: "#64748b",
}));
add(...arrow(280, 200, 350, 200, "uses app", { frameId: system.id }));
add(...arrow(630, 150, 700, 150, "login", { frameId: system.id }));
add(...arrow(630, 270, 700, 310, "reads user data", { frameId: system.id }));
add(...arrow(630, 220, 1010, 220, "HTTPS / callable", { frameId: system.id }));
add(...arrow(950, 160, 1010, 160, "ID token", { frameId: system.id }));
add(...arrow(950, 300, 1010, 300, "doc reads / writes", { frameId: system.id }));
add(...arrow(1330, 160, 1390, 160, "secrets", { frameId: system.id }));
add(...arrow(1530, 260, 1170, 320, "triggers jobs", { frameId: system.id }));
add(...arrow(1070, 320, 840, 370, "persist normalized data", { frameId: system.id }));
add(...arrow(1110, 320, 280, 490, "fetch messages", { frameId: system.id }));
add(...arrow(1140, 320, 590, 490, "delta / new mail", { frameId: system.id }));
add(...arrow(1170, 320, 905, 490, "parse payload", { frameId: system.id }));
add(...arrow(1200, 320, 1210, 490, "billing events", { frameId: system.id }));
add(...arrow(1250, 320, 1500, 490, "send reminders", { frameId: system.id }));

const flow = frame(0, 1030, 1820, 980, "2. Working Flow");
add(flow);
add(text(40, 1065, 700, "Product flow: onboarding to reminder delivery", {
  frameId: flow.id,
  fontSize: 30,
  align: "left",
}));
const workingFlowBoxes = [
  [60, 1170, 210, 120, "1. User signs up\nand selects Spain / locale"],
  [320, 1170, 230, 120, "2. User connects\nGmail or Outlook"],
  [610, 1170, 240, 120, "3. OAuth callback stores\nencrypted refresh token\nand consent record"],
  [920, 1170, 230, 120, "4. Initial scan fetches\nhistorical billing emails"],
  [1210, 1170, 240, 120, "5. Scheduled sync reads\nonly new or changed mail"],
  [1510, 1170, 230, 120, "6. AI parser extracts\nmerchant, amount,\ndue date, cadence"],
  [120, 1460, 240, 120, "7. Confidence gate\nauto publish or\nmanual review queue"],
  [430, 1460, 240, 120, "8. Save normalized bill\nstatus, category,\nprovider message ref"],
  [740, 1460, 240, 120, "9. Create reminders\nemail templates\nnext send times"],
  [1050, 1460, 240, 120, "10. Send Resend email\nand optional push later"],
  [1360, 1460, 250, 120, "11. User sees dashboard\nupcoming bills\nrenewal changes"],
];
workingFlowBoxes.forEach(([x, y, width, height, label], index) => {
  add(...rect(x, y, width, height, label, {
    frameId: flow.id,
    backgroundColor: index < 6 ? "#ecfdf5" : "#f8fafc",
  }));
});
add(...arrow(270, 1230, 320, 1230, null, { frameId: flow.id }));
add(...arrow(550, 1230, 610, 1230, null, { frameId: flow.id }));
add(...arrow(850, 1230, 920, 1230, null, { frameId: flow.id }));
add(...arrow(1150, 1230, 1210, 1230, null, { frameId: flow.id }));
add(...arrow(1450, 1230, 1510, 1230, null, { frameId: flow.id }));
add(...arrow(1625, 1290, 240, 1460, "parsed output", { frameId: flow.id }));
add(...arrow(360, 1520, 430, 1520, null, { frameId: flow.id }));
add(...arrow(670, 1520, 740, 1520, null, { frameId: flow.id }));
add(...arrow(980, 1520, 1050, 1520, null, { frameId: flow.id }));
add(...arrow(1290, 1520, 1360, 1520, null, { frameId: flow.id }));
add(...rect(1250, 1665, 500, 150, "Data minimization rule\nDo not persist full raw email long term.\nKeep only normalized bill fields and short-lived raw cache with TTL for retries or manual review.", {
  frameId: flow.id,
  backgroundColor: "#fff7ed",
  strokeColor: "#f97316",
}));
add(...rect(70, 1665, 500, 150, "Reminder logic\nDue-date reminders are bill-driven, not inbox-driven.\nEach bill can own multiple reminder instances and delivery logs.", {
  frameId: flow.id,
  backgroundColor: "#eff6ff",
  strokeColor: "#2563eb",
}));

const api = frame(0, 2100, 1820, 1040, "3. API / OAuth Flow");
add(api);
add(text(40, 2135, 840, "OAuth and ingestion flow", {
  frameId: api.id,
  fontSize: 30,
  align: "left",
}));
add(text(90, 2210, 260, "FlutterFlow App", { frameId: api.id, fontSize: 22, color: "#4f46e5" }));
add(text(530, 2210, 300, "Cloud Functions", { frameId: api.id, fontSize: 22, color: "#16a34a" }));
add(text(1010, 2210, 330, "Email Provider", { frameId: api.id, fontSize: 22, color: "#dc2626" }));
add(text(1450, 2210, 240, "Firestore", { frameId: api.id, fontSize: 22, color: "#2563eb" }));
add(...rect(70, 2280, 260, 90, "Tap Connect Gmail\nor Connect Outlook", {
  frameId: api.id,
  backgroundColor: "#eef2ff",
  strokeColor: "#4f46e5",
}));
add(...rect(450, 2260, 320, 120, "createOAuthSession()\nprovider, state, PKCE,\nredirect URL", {
  frameId: api.id,
}));
add(...rect(930, 2260, 350, 120, "Google / Microsoft consent\nUser approves requested scopes", {
  frameId: api.id,
  backgroundColor: "#fef2f2",
  strokeColor: "#dc2626",
}));
add(...rect(1440, 2260, 250, 120, "consent_records\nmailbox_connections\nstatus = pending", {
  frameId: api.id,
  backgroundColor: "#eff6ff",
  strokeColor: "#2563eb",
}));
add(...rect(450, 2470, 320, 120, "oauthCallback()\nexchange code for\naccess + refresh token", {
  frameId: api.id,
}));
add(...rect(930, 2470, 350, 120, "Token endpoint\nreturns refresh token\nif offline access allowed", {
  frameId: api.id,
  backgroundColor: "#fef2f2",
  strokeColor: "#dc2626",
}));
add(...rect(1440, 2470, 250, 140, "Encrypt token blob\nsave scopes\nsave provider mailbox\nconnection status = active", {
  frameId: api.id,
  backgroundColor: "#eff6ff",
  strokeColor: "#2563eb",
}));
add(...rect(450, 2680, 320, 120, "enqueueInitialSync()\nthen periodic sync job", {
  frameId: api.id,
}));
add(...rect(930, 2680, 350, 140, "Read new messages only\nGmail: history / filtered reads\nGraph: delta query", {
  frameId: api.id,
  backgroundColor: "#fef2f2",
  strokeColor: "#dc2626",
}));
add(...rect(450, 2900, 320, 120, "parseBill()\nLLM -> strict JSON schema\nconfidence + anomalies", {
  frameId: api.id,
  backgroundColor: "#fdf2f8",
  strokeColor: "#db2777",
}));
add(...rect(1440, 2875, 250, 160, "Write bills\nwrite reminders\nwrite audit events\nupdate sync cursor", {
  frameId: api.id,
  backgroundColor: "#eff6ff",
  strokeColor: "#2563eb",
}));
add(...arrow(330, 2325, 450, 2325, null, { frameId: api.id }));
add(...arrow(770, 2325, 930, 2325, null, { frameId: api.id }));
add(...arrow(1280, 2325, 1440, 2325, null, { frameId: api.id }));
add(...arrow(1105, 2380, 610, 2470, "auth code", { frameId: api.id }));
add(...arrow(770, 2530, 930, 2530, null, { frameId: api.id }));
add(...arrow(1280, 2530, 1440, 2530, null, { frameId: api.id }));
add(...arrow(610, 2590, 610, 2680, null, { frameId: api.id }));
add(...arrow(770, 2740, 930, 2740, null, { frameId: api.id }));
add(...arrow(1105, 2820, 610, 2900, "message payload", { frameId: api.id }));
add(...arrow(770, 2960, 1440, 2960, "normalized bill JSON", { frameId: api.id }));
add(...rect(60, 2875, 260, 170, "Recommended scopes\nGmail: gmail.readonly only if body text is required;\notherwise prefer gmail.metadata.\nGraph: openid profile email offline_access Mail.Read.", {
  frameId: api.id,
  backgroundColor: "#fffbeb",
  strokeColor: "#ca8a04",
}));

const erd = frame(0, 3230, 1820, 1380, "4. Firestore Logical ER Diagram");
add(erd);
add(text(40, 3265, 900, "Firestore schema (logical ERD, implemented as collections)", {
  frameId: erd.id,
  fontSize: 30,
  align: "left",
}));
add(...table(40, 3360, 270, "users", [
  "uid PK",
  "email",
  "display_name",
  "locale",
  "country",
  "plan_status",
  "created_at",
], { frameId: erd.id, headerColor: "#0f766e" }));
add(...table(350, 3360, 320, "app_subscriptions", [
  "id PK",
  "user_id FK",
  "provider",
  "external_customer_id",
  "entitlement",
  "status",
  "renews_at",
], { frameId: erd.id, headerColor: "#0ea5e9" }));
add(...table(710, 3360, 340, "mailbox_connections", [
  "id PK",
  "user_id FK",
  "provider",
  "mailbox_email",
  "scopes[]",
  "status",
  "token_ciphertext",
  "last_synced_at",
], { frameId: erd.id, headerColor: "#dc2626" }));
add(...table(1090, 3360, 320, "sync_cursors", [
  "id PK",
  "connection_id FK",
  "history_id / delta_link",
  "sync_status",
  "last_success_at",
  "updated_at",
], { frameId: erd.id, headerColor: "#f97316" }));
add(...table(1450, 3360, 320, "consent_records", [
  "id PK",
  "user_id FK",
  "provider",
  "scopes[]",
  "policy_version",
  "granted_at",
  "revoked_at",
], { frameId: erd.id, headerColor: "#7c3aed" }));
add(...table(40, 3830, 300, "raw_email_cache", [
  "id PK",
  "connection_id FK",
  "provider_message_id",
  "payload_ref",
  "parse_status",
  "expires_at TTL",
], { frameId: erd.id, headerColor: "#ca8a04" }));
add(...table(390, 3830, 360, "bills", [
  "id PK",
  "user_id FK",
  "connection_id FK",
  "merchant_name",
  "amount / currency",
  "due_date",
  "renewal_period",
  "status",
  "confidence",
], { frameId: erd.id, headerColor: "#2563eb" }));
add(...table(790, 3830, 320, "reminders", [
  "id PK",
  "user_id FK",
  "bill_id FK",
  "send_at",
  "channel",
  "state",
  "template_version",
], { frameId: erd.id, headerColor: "#2563eb" }));
add(...table(1150, 3830, 320, "reminder_deliveries", [
  "id PK",
  "reminder_id FK",
  "provider",
  "provider_message_id",
  "delivered_at",
  "bounced_at",
], { frameId: erd.id, headerColor: "#0891b2" }));
add(...table(1510, 3830, 260, "audit_events", [
  "id PK",
  "user_id FK",
  "entity_type",
  "entity_id",
  "action",
  "metadata",
  "created_at",
], { frameId: erd.id, headerColor: "#64748b" }));
add(...arrow(175, 3490, 510, 3490, "user owns subscription", { frameId: erd.id }));
add(...arrow(175, 3520, 880, 3520, "user owns mailbox", { frameId: erd.id }));
add(...arrow(175, 3550, 1600, 3550, "user grants consent / owns audit", { frameId: erd.id }));
add(...arrow(880, 3600, 1250, 3600, "connection has sync cursor", { frameId: erd.id }));
add(...arrow(880, 3690, 190, 3830, "connection cache", { frameId: erd.id }));
add(...arrow(880, 3720, 570, 3830, "connection produces bills", { frameId: erd.id }));
add(...arrow(175, 3720, 570, 3830, "user owns bills", { frameId: erd.id }));
add(...arrow(570, 4050, 950, 4050, "bill schedules reminders", { frameId: erd.id }));
add(...arrow(950, 4050, 1310, 4050, "reminder delivery logs", { frameId: erd.id }));
add(...arrow(175, 3780, 1600, 3830, "user audit trail", { frameId: erd.id }));

const security = frame(0, 4700, 1820, 960, "5. Security / Revocation Flow");
add(security);
add(text(40, 4735, 900, "Trust, transparency, and revocation flow", {
  frameId: security.id,
  fontSize: 30,
  align: "left",
}));
add(...rect(80, 4870, 250, 110, "User opens Trust Center\nDisconnect mailbox\nor sign out everywhere", {
  frameId: security.id,
  backgroundColor: "#eef2ff",
  strokeColor: "#4f46e5",
}));
add(...rect(410, 4840, 330, 150, "Cloud Function verifies\nFirebase ID token\nand ownership of mailbox\nconnection", {
  frameId: security.id,
  backgroundColor: "#ecfdf5",
  strokeColor: "#16a34a",
}));
add(...diamond(820, 4850, 250, 140, "Mailbox revoke\nor full session\nrevoke?", {
  frameId: security.id,
  backgroundColor: "#fffbeb",
  strokeColor: "#ca8a04",
}));
add(...rect(1150, 4800, 260, 120, "Provider revoke path\ncall Google / Microsoft\nrevoke endpoint where\nsupported", {
  frameId: security.id,
  backgroundColor: "#fef2f2",
  strokeColor: "#dc2626",
}));
add(...rect(1150, 4980, 260, 120, "Session revoke path\nFirebase Admin\nrevokeRefreshTokens(uid)", {
  frameId: security.id,
  backgroundColor: "#fff7ed",
  strokeColor: "#f97316",
}));
add(...rect(1490, 4830, 250, 140, "Delete encrypted token\nmark connection revoked\nstop scheduled sync\nclear sync cursor", {
  frameId: security.id,
  backgroundColor: "#eff6ff",
  strokeColor: "#2563eb",
}));
add(...rect(1490, 5030, 250, 120, "Short-lived raw cache\nexpires via TTL\nwithin retention window", {
  frameId: security.id,
  backgroundColor: "#fefce8",
  strokeColor: "#ca8a04",
}));
add(...rect(420, 5200, 540, 130, "Transparency log\nAppend audit event for connect, consent change,\nsync run, reminder sent, disconnect, and full logout.", {
  frameId: security.id,
  backgroundColor: "#f8fafc",
  strokeColor: "#64748b",
}));
add(...rect(1080, 5200, 570, 130, "User experience rule\nAlways show connected mailbox, granted scopes,\nlast sync time, and a one-tap revoke / delete path.", {
  frameId: security.id,
  backgroundColor: "#f0fdf4",
  strokeColor: "#16a34a",
}));
add(...arrow(330, 4925, 410, 4925, null, { frameId: security.id }));
add(...arrow(740, 4925, 820, 4925, null, { frameId: security.id }));
add(...arrow(1070, 4890, 1150, 4860, "mailbox", { frameId: security.id }));
add(...arrow(1070, 4955, 1150, 5040, "sessions", { frameId: security.id }));
add(...arrow(1410, 4860, 1490, 4900, null, { frameId: security.id }));
add(...arrow(1410, 5040, 1490, 5090, null, { frameId: security.id }));
add(...arrow(1615, 4970, 1615, 5030, "cache cleanup", { frameId: security.id }));
add(...arrow(620, 4990, 620, 5200, "audit", { frameId: security.id }));
add(...arrow(1620, 5150, 1370, 5200, "status to UI", { frameId: security.id }));

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
