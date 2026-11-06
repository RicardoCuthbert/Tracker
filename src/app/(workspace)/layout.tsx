import { PrototypeProvider } from "@/features/prototype/context";
import { Shell } from "@/features/prototype/shell";
import { jakartaDate } from "@/lib/prototype";

export const dynamic = "force-dynamic";
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <PrototypeProvider today={jakartaDate(new Date())}><Shell>{children}</Shell></PrototypeProvider>;
}
