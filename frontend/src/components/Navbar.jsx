import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Navbar({ onLogout, isAuthed }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-[#E8F5E9]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="text-[#2E7D32]" size={22} />
          <div className="font-semibold tracking-wide text-[#1B5E20]" data-testid="brand-title">HITAM · Online Out Pass</div>
        </div>
        {isAuthed ? (
          <Button data-testid="logout-button" onClick={onLogout} className={cn("rounded-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white")}>Logout</Button>
        ) : null}
      </div>
    </header>
  );
}
