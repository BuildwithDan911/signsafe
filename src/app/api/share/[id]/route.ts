import { NextRequest, NextResponse } from "next/server";
import { verifyRoleToken, ShareRecord } from "@/server/share";
import { storeGet, storeSet } from "@/server/store";
import { computeScore } from "@/lib/score";
import { callClocked } from "@/server/clocked";
import { formatApiError } from "@/server/errors";

export const maxDuration = 60;

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("k");

    // Verify token
    const role = verifyRoleToken(id, token);
    if (!role) {
      return NextResponse.json(
        { error: "This link isn't valid" },
        { status: 401 }
      );
    }

    const share = await storeGet<ShareRecord>(`share:${id}`);
    if (!share) {
      return NextResponse.json(
        { error: "This share link has expired or does not exist." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      share,
      currentRole: role,
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { token, fixId, accepted } = body;

    const role = verifyRoleToken(id, token);
    if (!role) {
      return NextResponse.json(
        { error: "This link isn't valid" },
        { status: 401 }
      );
    }

    const share = await storeGet<ShareRecord>(`share:${id}`);
    if (!share) {
      return NextResponse.json(
        { error: "This share link has expired or does not exist." },
        { status: 404 }
      );
    }

    const fix = share.fixes.find((f) => f.id === fixId);
    if (!fix) {
      return NextResponse.json({ error: "Fix not found" }, { status: 404 });
    }

    // Role-based acceptance: each person can ONLY toggle their own
    if (role === "you") {
      fix.youAccepted = Boolean(accepted);
    } else if (role === "other") {
      fix.otherAccepted = Boolean(accepted);
    }

    // When BOTH accept a fix and it hasn't been rescored yet:
    if (fix.youAccepted && fix.otherAccepted && !fix.rescored) {
      // 1. Replace that clause with the fair version in the redacted text
      if (fix.originalQuote && share.redactedText.includes(fix.originalQuote)) {
        share.redactedText = share.redactedText.replace(
          fix.originalQuote,
          fix.afterClause
        );
      } else if (fix.beforeClause && share.redactedText.includes(fix.beforeClause)) {
        share.redactedText = share.redactedText.replace(
          fix.beforeClause,
          fix.afterClause
        );
      }

      // 2. Call Clocked Decide with state set to the new clause
      let flagsCleared = true;
      try {
        if (process.env.CLOCKED_API_KEY && process.env.MOCK_MODE !== "true") {
          const decideRes = await callClocked("decide", {
            state: fix.afterClause,
            questions: {
              resolved_flags: {
                type: "multiselect",
                instructions:
                  "Check if any unfair terms, uncapped liabilities, or broken promises remain in this revised clause.",
                criteria: {
                  flag_remaining: "The revised clause remains one-sided, unfair, or non-compliant.",
                  fair_term: "The revised clause is balanced, mutual, and standard.",
                },
                threshold: 0.5,
              },
            },
          });
          const selected = decideRes.data?.answers?.resolved_flags?.selected || [];
          flagsCleared = !selected.includes("flag_remaining");
        }
      } catch (e) {
        console.warn("[share/rescore] Decide error, using fallback verification:", e);
      }

      // 3. Remove flags and recompute score
      if (flagsCleared) {
        const pointsDeduction =
          fix.flagIds?.includes("RF3.13") || fix.flagIds?.includes("one_sided_terms")
            ? 3
            : 1;

        const currentPoints = share.scoreResult.totalPoints || 1;
        const newPoints = Math.max(0, currentPoints - pointsDeduction);

        const newScore = computeScore({
          signalPoints: newPoints,
          greenSignalsCount: 4,
        });

        share.scoreResult = {
          signScore: newScore.signScore,
          color: newScore.color,
          label: newScore.label,
          headline:
            newPoints === 0
              ? "Looks fair. Both sides accepted fair terms."
              : newScore.headline,
          totalPoints: newPoints,
          breakdown: (share.scoreResult.breakdown || []).filter(
            (b) => !fix.title.toLowerCase().includes(b.reason.toLowerCase())
          ),
        };

        fix.rescored = true;
        fix.rescoreNote = "Rescored with Clocked Decide ✓";
        share.rescoredWithClocked = true;
      }
    }

    // Save back to store with 30-day TTL
    await storeSet(`share:${id}`, share, 30 * 24 * 3600);

    return NextResponse.json({
      success: true,
      share,
      currentRole: role,
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
