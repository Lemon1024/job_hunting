import type { Application, ApplicationInput, EventInput } from "./types";
import type { SupabaseClientLike } from "./supabase";

export async function listApplications(client: SupabaseClientLike): Promise<Application[]> {
  const { data, error } = await client
    .from("applications")
    .select("*, events:application_events(*)")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Application[]).map((application) => ({
    ...application,
    events: [...(application.events ?? [])].sort((a, b) => b.event_date.localeCompare(a.event_date))
  }));
}

export async function createApplication(client: SupabaseClientLike, input: ApplicationInput) {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("No signed-in user.");

  const { data, error } = await client
    .from("applications")
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Application;
}

export async function updateApplication(
  client: SupabaseClientLike,
  id: string,
  patch: Partial<ApplicationInput>
) {
  const { data, error } = await client
    .from("applications")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Application;
}

export async function deleteApplication(client: SupabaseClientLike, id: string) {
  const { error } = await client.from("applications").delete().eq("id", id);
  if (error) throw error;
}

export async function createEvent(client: SupabaseClientLike, input: EventInput) {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("No signed-in user.");

  const { data, error } = await client
    .from("application_events")
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(client: SupabaseClientLike, id: string) {
  const { error } = await client.from("application_events").delete().eq("id", id);
  if (error) throw error;
}
