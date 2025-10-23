import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Navbar({ onLogout, isAuthed }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-[#E8F5E9]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://customer-assets.emergentagent.com/job_3661e27b-0cda-421d-bf85-a3c4269cebb1/artifacts/zna0ccac_Hitam-logo-greenbg.svg" alt="HITAM" className="h-8 w-8 rounded-sm object-contain" data-testid="hitam-logo" />
          <div className="font-semibold tracking-wide text-[#1B5E20]" data-testid="brand-title">Hyderabad Institute of Technology and Management · Online Out Pass</div>
        </div>
        {isAuthed ? (
          <Button data-testid="logout-button" onClick={onLogout} className={cn("rounded-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-4 py-2 text-sm")}>Logout</Button>
        ) : null}
      </div>
    </header>
  );
}
