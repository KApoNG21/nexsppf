const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3102").replace(/\/$/, "");
const routes = [
  "/",
  "/about-nexs",
  "/clear-ppf",
  "/matte-ppf",
  "/color-ppf",
  "/compare",
  "/warranty",
  "/login",
];

let failures = 0;
for (const route of routes) {
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    const accepted = response.status >= 200 && response.status < 400;
    console.log(`${accepted ? "PASS" : "FAIL"} ${response.status} ${route}`);
    if (!accepted) failures += 1;
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${route}: ${error.message}`);
  }
}

if (failures > 0) {
  throw new Error(`${failures} smoke test(s) failed`);
}
