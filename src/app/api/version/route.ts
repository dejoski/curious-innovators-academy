import packageJson from "../../../../package.json";

export async function GET() {
  return Response.json({ version: packageJson.version });
}
