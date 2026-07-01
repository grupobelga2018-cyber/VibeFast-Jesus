import DocsShell from "@/components/docs/DocsShell"
import { getDocsTree } from "@/lib/docs"

export default function DocsLayout({ children }) {
  const tree = getDocsTree()
  return <DocsShell tree={tree}>{children}</DocsShell>
}
