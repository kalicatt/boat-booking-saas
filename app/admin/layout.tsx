import type { ReactNode } from "react";

import "../globals.css";

import AdminLayoutSwitcher from "./_components/AdminLayoutSwitcher";

export const metadata = {
  title: 'Admin - Sweet Narcisse',
  description: 'Panneau de gestion',
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return <AdminLayoutSwitcher>{children}</AdminLayoutSwitcher>
}