import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Remove auth check - allow public access to user email for creator display
    const { id } = await params;
    const client = await clerkClient();
    const user = await client.users.getUser(id);

    const email = user.emailAddresses?.[0]?.emailAddress || user.username || id;

    return NextResponse.json({
      email,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
};