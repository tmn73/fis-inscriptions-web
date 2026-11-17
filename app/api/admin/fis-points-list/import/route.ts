import {NextResponse} from "next/server";
import {auth} from "@clerk/nextjs/server";
import {isAdmin} from "@/app/lib/checkRole";
import {importLatestFisPointsList} from "@/app/lib/fisPointsListImport";

// Downloading and upserting a full points list takes several seconds
export const maxDuration = 60;

export const POST = async () => {
  const {userId} = await auth();
  if (!userId) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }
  if (!(await isAdmin())) {
    return NextResponse.json({error: "Forbidden"}, {status: 403});
  }

  try {
    const result = await importLatestFisPointsList();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error importing FIS points list:", error);
    return NextResponse.json({error: "Import failed"}, {status: 500});
  }
};
