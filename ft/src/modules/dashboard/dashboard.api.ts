import { http } from "../../api/http";

export async function getDashboardSummary(from?: string, to?: string) {
  const { data } = await http.get("/dashboard/summary", {
    params: { from, to },
  });
  return data;
}
