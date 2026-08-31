const LOGIN_ALIASES: Record<string, string> = {
  thenext: "thenext@nexsppf.com",
  "the next": "thenext@nexsppf.com",
};

export function resolvePartnerLoginIdentifier(input: string): string {
  const value = input.trim().toLowerCase().replace(/\s+/g, " ");
  return LOGIN_ALIASES[value] ?? value;
}
