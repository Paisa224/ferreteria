export type CashRegister = {
  id: number;
  name: string;
  is_active: boolean;
};

export type OpenSessionDto = {
  cash_register_id: number;
  opening_amount: number;
};

export type CashSession = {
  id: number;
  cash_register_id: number;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  opening_amount: string | number;
  closed_at?: string | null;
  closing_amount?: string | number | null;
  cashRegister?: CashRegister;
  openedByUser?: { id: number; username: string; name: string };
};

export type CashMovementDto = {
  type: "IN" | "OUT";
  concept: string;
  amount: number;
  reference?: string | null;
};

export type CashMovement = {
  id: number;
  type: "IN" | "OUT";
  amount: string | number;
  concept: string;
  created_at: string;
  created_by: number;
  reference?: string | null;
  createdByUser?: { id: number; username: string; name: string };
};

export type CashCountDenominationDto = {
  denom_value: number;
  qty: number;
};

export type CashCountDto = {
  denominations: CashCountDenominationDto[];
};

export type CashCount = {
  id: number;
  total_counted: string | number;
  expected_total: string | number;
  difference: string | number;
  counted_at: string;
  denominations: Array<{
    denom_value: string | number;
    qty: number;
    subtotal: string | number;
  }>;
};

export type CashSummary = {
  session_id: number;
  status: "OPEN" | "CLOSED";
  opening_amount: string | number;
  sum_in: string | number;
  sum_out: string | number;
  expected_cash: string | number;
  opened_at: string;
};
