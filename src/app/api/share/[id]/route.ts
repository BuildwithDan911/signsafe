import { NextRequest, NextResponse } from "next/server";
import { verifyRoleToken, ShareRecord, getRescoreStatus } from "@/server/share";
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

      // 2. Call Clocked Decide with state set to the new clause and the attached flags
      let flagsCleared = true;
      let usedClockedDecide = false;
      try {
        if (
          process.env.CLOCKED_API_KEY &&
          process.env.MOCK_MODE !== "true" &&
          process.env.LIVE_CHECKS_ENABLED !== "false"
        ) {
          // Construct multiselect criteria limited to the flags attached to this clause
          const attachedCriteria: Record<string, string> = {};
          if (Array.isArray(fix.flagIds) && fix.flagIds.length > 0) {
            for (const fid of fix.flagIds) {
              attachedCriteria[fid] = `Flag ${fid}: unfair or one-sided condition remains.`;
            }
          }
          attachedCriteria["balanced_fair"] = "Balanced, standard, or mutual terms.";

          const decideRes = await callClocked("decide", {
            state: fix.afterClause,
            questions: {
              attached_flags: {
                type: "multiselect",
                instructions:
                  "Evaluate if any of the specified unfair warning flags are still present in this revised clause.",
                criteria: attachedCriteria,
                threshold: 0.5,
              },
            },
          });
          const selected = decideRes.data?.answers?.attached_flags?.selected || [];
          // Flag is cleared if none of the attached flags were selected
          flagsCleared = !fix.flagIds?.some((fid) => selected.includes(fid));
          usedClockedDecide = true;
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
        const rescoreStatus = getRescoreStatus(usedClockedDecide);
        fix.rescoreNote = rescoreStatus.rescoreNote;
        share.rescoredWithClocked = rescoreStatus.rescoredWithClocked;
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
