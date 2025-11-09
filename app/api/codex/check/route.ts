import {NextResponse} from "next/server";
import {checkDuplicateCodex} from "@/app/lib/checkDuplicateCodex";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const {searchParams} = new URL(req.url);
  const number = searchParams.get("number");
  const excludeId = searchParams.get("excludeId");
  const seasonCode = searchParams.get("seasonCode");

  if (!number) {
    return NextResponse.json({error: "Missing codex number"}, {status: 400});
  }

  const result = await checkDuplicateCodex(
    number,
    seasonCode || undefined,
    excludeId || undefined
  );

  return NextResponse.json(result);
}
