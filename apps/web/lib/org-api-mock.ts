export type CreateOrgInput = {
  name: string;
  entity_type: string;
  industry: string;
  jurisdiction: "NZ" | "AU";
};

export type CreateOrgOutput = {
  id: string;
  name: string;
  entity_type: string;
  industry: string;
  jurisdiction: string;
  created_at: string;
};

export type InviteUserInput = {
  org_id: string;
  email: string;
  role: "admin" | "member";
};

export type InviteUserOutput = {
  id: string;
  org_id: string;
  email: string;
  role: string;
  invited_at: string;
  accepted_at: null;
};

export type AcceptInviteInput = {
  invite_id: string;
};

export type AcceptInviteOutput = {
  id: string;
  org_id: string;
  role: string;
  accepted_at: string;
};

const MOCK_ORG_ID = "org_mock_atlas";
const LATENCY_MS = 600;

function wait() {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

function idFor(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}`;
}

export async function createOrg(
  input: CreateOrgInput,
): Promise<CreateOrgOutput> {
  await wait();

  if (input.name.trim().toLowerCase() === "fail") {
    throw new Error("Mock organisation creation failed. Try another name.");
  }

  return {
    id: idFor("org"),
    name: input.name,
    entity_type: input.entity_type,
    industry: input.industry,
    jurisdiction: input.jurisdiction,
    created_at: new Date().toISOString(),
  };
}

export async function inviteUser(
  input: InviteUserInput,
): Promise<InviteUserOutput> {
  await wait();

  if (input.email.trim().toLowerCase() === "fail@test.com") {
    throw new Error("Mock invite failed for fail@test.com.");
  }

  return {
    id: idFor("invite"),
    org_id: input.org_id,
    email: input.email,
    role: input.role,
    invited_at: new Date().toISOString(),
    accepted_at: null,
  };
}

export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<AcceptInviteOutput> {
  await wait();

  if (input.invite_id.trim().toLowerCase() === "fail") {
    throw new Error("Mock invite acceptance failed.");
  }

  return {
    id: input.invite_id,
    org_id: MOCK_ORG_ID,
    role: "member",
    accepted_at: new Date().toISOString(),
  };
}
