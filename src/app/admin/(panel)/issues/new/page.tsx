import type { Metadata } from "next";
import IssueForm from "@/components/admin/issue-form";

export const metadata: Metadata = {
  title: "New issue — Admin",
};

export default function NewIssuePage() {
  return <IssueForm mode="create" />;
}
