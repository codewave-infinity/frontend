import type { ZKVerifyRequest } from "@/types/contracts";

// Stub for P1's ZK proof generation library.
// In production this calls Semaphore (Circom + snarkjs) on the client to
// build a group-membership proof for the chosen bank credential. For the
// hackathon demo we hand back deterministic fake proof material so the
// backend can mock-verify without circuits being wired yet.
//
// When P1 ships the real lib, replace the body of generateMembershipProof
// with a call into their package — the return shape stays the same.

export interface BankIdentity {
  id: string;          // "bank-a", etc.
  displayName: string; // "Bank A"
  // In real life: a serialized credential (BBS+ signature) lives here.
}

const TEST_BANKS: BankIdentity[] = [
  { id: "bank-a", displayName: "Bank A" },
  { id: "bank-b", displayName: "Bank B" },
  { id: "bank-c", displayName: "Bank C" },
  { id: "bank-d", displayName: "Bank D" },
  { id: "bank-e", displayName: "Bank E" },
  { id: "bank-f", displayName: "Bank F" },
];

export function listTestBanks(): BankIdentity[] {
  return TEST_BANKS;
}

export async function generateMembershipProof(
  bank: BankIdentity,
): Promise<ZKVerifyRequest> {
  // Simulate the ~600ms a real Semaphore proof takes on a laptop.
  await new Promise((r) => setTimeout(r, 650));

  const seed = `${bank.id}:${Date.now()}`;
  const nullifierHash = "0x" + hash(seed).padEnd(64, "0");
  return {
    proof: { mock: true, bank: bank.id },
    publicSignals: [nullifierHash, "0x" + "01".repeat(32)],
    nullifierHash,
  };
}

function hash(s: string): string {
  // Tiny non-cryptographic hash purely for stable demo IDs.
  let h = 0xdeadbeef;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
  }
  return (h >>> 0).toString(16);
}
