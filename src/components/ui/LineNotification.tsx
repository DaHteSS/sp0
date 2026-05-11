"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  role?: "status" | "alert";
};

export function LineNotification({ children, role = "status" }: Props) {
  return (
    <div
      role={role}
      className='border-b border-amber-800/90 bg-amber-950/85 px-4 py-2 text-center text-sm text-amber-100'
    >
      {children}
    </div>
  );
}
