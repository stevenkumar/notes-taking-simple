import { PageHeader } from "@/components/layout/page-header";
import { NotesModule } from "@/modules/notes/components/notes-module";

export const metadata = { title: "Notes" };

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes & Notebook"
        description="Capture ideas, lists and everything in between"
      />
      <NotesModule />
    </div>
  );
}
