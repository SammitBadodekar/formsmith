import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Button asChild>
        <Link href={process.env.NEXT_PUBLIC_APP_URL!}>Go to App</Link>
      </Button>
    </div>
  );
}
