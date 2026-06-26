export const SUPPORTED_JURISDICTIONS = ["nz", "au"] as const;

export type Jurisdiction = (typeof SUPPORTED_JURISDICTIONS)[number];

export const ORG_ROLES = ["owner", "admin", "member", "advisor"] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const LICENCE_TYPES = [
  "lbp",
  "electrician",
  "plumber",
  "gasfitter",
  "drainlayer",
  "qbcc",
  "nsw_fair_trading"
] as const;

export type LicenceType = (typeof LICENCE_TYPES)[number];
