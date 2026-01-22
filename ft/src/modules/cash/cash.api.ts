import { http } from "../../api/http";
import type {
  CashCount,
  CashCountDto,
  CashMovement,
  CashMovementDto,
  CashRegister,
  CashSession,
  CashSummary,
  OpenSessionDto,
} from "./cash.types";

export async function listCashRegisters(): Promise<CashRegister[]> {
  const { data } = await http.get("/cash/registers");
  return data;
}

export async function createCashRegister(dto: {
  name: string;
}): Promise<CashRegister> {
  const { data } = await http.post("/cash/registers", dto);
  return data;
}

export async function listOpenSessions(): Promise<CashSession[]> {
  const { data } = await http.get("/cash/sessions/current");
  return data;
}

export async function myOpenSession(): Promise<CashSession | null> {
  try {
    const { data } = await http.get("/cash/sessions/my-open");
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function openCashSession(
  dto: OpenSessionDto,
): Promise<CashSession> {
  const { data } = await http.post("/cash/sessions/open", dto);
  return data;
}

export async function getCashSummary(sessionId: number): Promise<CashSummary> {
  const { data } = await http.get(`/cash/sessions/${sessionId}/summary`);
  return data;
}

export async function addCashMovement(
  sessionId: number,
  dto: CashMovementDto,
): Promise<CashMovement> {
  const { data } = await http.post(
    `/cash/sessions/${sessionId}/movements`,
    dto,
  );
  return data;
}

export async function listCashMovements(
  sessionId: number,
): Promise<CashMovement[]> {
  const { data } = await http.get(`/cash/sessions/${sessionId}/movements`);
  return data;
}

export async function countCash(
  sessionId: number,
  dto: CashCountDto,
): Promise<CashCount> {
  const { data } = await http.post(`/cash/sessions/${sessionId}/count`, dto);
  return data;
}

export async function closeCashSession(
  sessionId: number,
  closing_amount?: number,
): Promise<CashSession> {
  const { data } = await http.post(`/cash/sessions/${sessionId}/close`, {
    closing_amount,
  });
  return data;
}

export async function listDenominations(): Promise<number[]> {
  const { data } = await http.get("/cash/denominations");
  return data;
}
