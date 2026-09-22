export async function isStaffUser(supabase, email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase()
  if (!normalized) return false

  const { data } = await supabase
    .from("staff")
    .select("email")
    .eq("email", normalized)
    .maybeSingle()

  return Boolean(data?.email)
}
