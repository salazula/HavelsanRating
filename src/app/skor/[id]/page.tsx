import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isManager, requireUser } from "@/lib/auth";
import { parsePoints } from "@/lib/live";
import { Scoreboard } from "@/components/scoreboard";
import { cancelLive, getLive, livePoint, startLive } from "./actions";

export const metadata: Metadata = { title: "Skorbord" };

export default async function ScoreboardPage({ params }: PageProps<"/skor/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const m = await db.match.findUnique({ where: { id }, include: { playerA: true, playerB: true, group: { include: { round: true } } } });
  if (!m) notFound();
  const mine = !!user.playerId && (m.playerAId === user.playerId || m.playerBId === user.playerId);
  if (!mine && !isManager(user)) redirect("/panel/maclarim");

  return (
    <Scoreboard
      matchId={m.id}
      groupCode={m.group.code}
      a={{ name: m.playerA.name, rating: m.playerA.rating }}
      b={{ name: m.playerB.name, rating: m.playerB.rating }}
      initial={{
        points: parsePoints(m.livePoints),
        firstServer: m.liveFirstServer === "A" || m.liveFirstServer === "B" ? m.liveFirstServer : null,
        version: m.liveVersion,
        status: m.status,
        started: !!m.liveStartedAt,
      }}
      actions={{ start: startLive, point: livePoint, cancel: cancelLive, get: getLive }}
    />
  );
}
