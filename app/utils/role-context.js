"use client";

import { createContext, useContext } from "react";

export const RoleContext = createContext({
  role: null,
  userId: null,
  orgId: null,
});

export function useRole() {
  return useContext(RoleContext);
}
