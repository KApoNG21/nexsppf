import bcrypt from "bcryptjs";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const email = required("ACCOUNT_EMAIL").trim().toLowerCase();
const displayName = required("ACCOUNT_NAME").trim();
const password = required("ACCOUNT_PASSWORD");
const role = required("ACCOUNT_ROLE").trim().toLowerCase();
const dealerCode = process.env.DEALER_CODE?.trim() || null;

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ACCOUNT_EMAIL is invalid");
if (displayName.length < 2) throw new Error("ACCOUNT_NAME is too short");
if (password.length < 12) throw new Error("ACCOUNT_PASSWORD must contain at least 12 characters");
if (role !== "admin" && role !== "dealer") throw new Error("ACCOUNT_ROLE must be admin or dealer");
if (role === "dealer" && !dealerCode) throw new Error("DEALER_CODE is required for a dealer account");
if (role === "admin" && dealerCode) throw new Error("DEALER_CODE must be empty for an admin account");

const pool = new pg.Pool({ connectionString, max: 1 });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const dealer = dealerCode
    ? await client.query(
        "SELECT id FROM dealers WHERE dealer_code = $1 AND status = 'active' LIMIT 1",
        [dealerCode],
      )
    : { rows: [{ id: null }] };
  if (dealerCode && !dealer.rows[0]) throw new Error(`Active dealer not found: ${dealerCode}`);

  const passwordHash = await bcrypt.hash(password, 12);
  const mustChangePassword = role === "dealer";
  await client.query(
    `INSERT INTO auth_accounts (email, display_name, password_hash, status, must_change_password)
     VALUES ($1, $2, $3, 'active', $4)
     ON CONFLICT (email) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       password_hash = EXCLUDED.password_hash,
       status = 'active',
       must_change_password = EXCLUDED.must_change_password,
       password_changed_at = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [email, displayName, passwordHash, mustChangePassword],
  );
  await client.query(
    `INSERT INTO account_roles (email, role, dealer_id, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email, role) DO UPDATE SET
       dealer_id = EXCLUDED.dealer_id,
       status = 'active',
       updated_at = CURRENT_TIMESTAMP`,
    [email, role, dealer.rows[0]?.id ?? null],
  );
  await client.query("COMMIT");
  console.log(`Account ready: ${email} (${role})`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
