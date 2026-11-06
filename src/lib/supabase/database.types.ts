// Generated from local SQL migrations by scripts/generate-rpc-types.mjs. Do not edit.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      accept_invite: { Args: { invitation: string }; Returns: string };
      allocate_goal: { Args: { w: string; op: string; goal: string; account: string; direction: string; amount: string }; Returns: Json };
      archive_goal: { Args: { w: string; op: string; goal: string; expected_version: number; release_reservations: boolean }; Returns: Json };
      create_shared_workspace: { Args: Record<string, never>; Returns: string };
      ensure_personal_workspace: { Args: Record<string, never>; Returns: string };
      invite_member: { Args: { w: string; recipient: string }; Returns: string };
      list_workspaces: { Args: Record<string, never>; Returns: Json };
      monthly_report: { Args: { w: string; month_start: string }; Returns: Json };
      read_audit: { Args: { w: string; after_id?: string }; Returns: Json };
      read_transactions: { Args: { w: string; from_date: string; until_date: string; after_date?: string; after_id?: string; page_size?: number }; Returns: Json };
      read_workspace: { Args: { w: string }; Returns: Json };
      read_workspace_overview: { Args: { w: string; month_start: string }; Returns: Json };
      save_financial_record: { Args: { w: string; op: string; entity: string; p: Json; expected_version?: number }; Returns: Json };
      save_transaction: { Args: { w: string; op: string; p: Json; expected_version?: number }; Returns: Json };
      void_transaction: { Args: { w: string; op: string; item: string; expected_version: number; reason: string }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
