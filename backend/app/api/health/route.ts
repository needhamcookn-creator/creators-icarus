import { type NextRequest } from "next/server";
import { getStorage, getStorageType } from "@/lib/storage";
import { corsHeaders } from "@/lib/cors";

export async function GET(request: NextRequest) {
  try {
    const storage = await getStorage();
    const recent = await storage.list(1);
    return Response.json(
      {
        status: "ok",
        storageType: getStorageType(),
        storage: recent.length >= 0 ? "connected" : "unknown",
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders(request) }
    );
  } catch (error) {
    console.error("[health] error:", error);
    return Response.json(
      { status: "error", message: "Storage check failed" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
