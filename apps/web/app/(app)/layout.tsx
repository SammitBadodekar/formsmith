import { getCurrentSession } from "@/lib/auth";
import Providers from "@/components/providers";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionData = await getCurrentSession();
  return <Providers sessionData={sessionData}>{children}</Providers>;
}
