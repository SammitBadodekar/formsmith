"use client";

import { Link } from "react-router";
import { Button } from "./components/ui/button";

export default function App() {
  return (
    <>
      <main className="p-8 flex flex-col gap-16">
        <Button asChild>
          <Link to={"/dashboard"}>Dashbaord</Link>
        </Button>
      </main>
    </>
  );
}
