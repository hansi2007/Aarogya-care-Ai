import { NextRequest } from "next/server";
import { db } from "@/db";
import { agentEvents, runs } from "@/db/schema";
import { and, asc, eq, gt } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastId = 0;
      let active = true;
      let finished = false;

      const send = (obj: unknown) => {
        if (!active) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          active = false;
        }
      };

      const tick = async () => {
        if (!active || finished) return;
        try {
          const rows = await db
            .select()
            .from(agentEvents)
            .where(and(eq(agentEvents.runId, id), gt(agentEvents.id, lastId)))
            .orderBy(asc(agentEvents.id))
            .limit(200);
          for (const r of rows) {
            lastId = r.id;
            send({ type: "event", event: r });
          }
          const [run] = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
          if (run && (run.status === "completed" || run.status === "failed")) {
            send({ type: "run", status: run.status });
            finished = true;
            active = false;
            clearInterval(iv);
            try {
              controller.close();
            } catch {}
          }
        } catch {
          /* transient DB hiccup — retry next tick */
        }
      };

      await tick();
      const iv = setInterval(tick, 100);
      req.signal.addEventListener("abort", () => {
        active = false;
        clearInterval(iv);
        try {
          controller.close();
        } catch {}
      });

      /* safety: never stream forever */
      setTimeout(() => {
        active = false;
        clearInterval(iv);
        try {
          controller.close();
        } catch {}
      }, 1000 * 60 * 8);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
