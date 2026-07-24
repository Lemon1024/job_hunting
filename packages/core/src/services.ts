import type {
  Application,
  ApplicationInput,
  EventInput,
  FollowUpTask,
  FollowUpTaskInput,
  LocationTag,
  Profile,
} from "./types";
import type { SupabaseClientLike } from "./supabase";

type ApplicationRow = Application & {
  location_links?: Array<{ location: LocationTag | null }>;
};

async function getCurrentUserId(client: SupabaseClientLike) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("No signed-in user.");
  return data.user.id;
}

export function normalizeLocationLabel(label: string) {
  const normalized = label.trim();
  if (!normalized) throw new Error("Location label is required.");
  if (normalized.length > 32) throw new Error("Location label must be 32 characters or fewer.");
  return normalized;
}

function normalizeTaskInput(input: FollowUpTaskInput): FollowUpTaskInput {
  const title = input.title.trim();
  const notes = input.notes?.trim() || null;
  if (!title) throw new Error("Follow-up title is required.");
  if (title.length > 200) throw new Error("Follow-up title must be 200 characters or fewer.");
  if (notes && notes.length > 2000) throw new Error("Follow-up notes must be 2000 characters or fewer.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due_date)) throw new Error("Follow-up date must use YYYY-MM-DD.");
  return { ...input, title, notes };
}

export async function listApplications(client: SupabaseClientLike): Promise<Application[]> {
  const { data, error } = await client
    .from("applications")
    .select("*, events:application_events(*), follow_up_tasks(*), location_links:application_location_tags(location:location_tags(*))")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ApplicationRow[]).map(({ location_links, ...application }) => ({
    ...application,
    locations: (location_links ?? [])
      .map((link) => link.location)
      .filter((location): location is LocationTag => Boolean(location))
      .sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
    follow_up_tasks: [...(application.follow_up_tasks ?? [])]
      .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    events: [...(application.events ?? [])]
      .sort((a, b) => b.event_date.localeCompare(a.event_date)),
  }));
}

export async function createApplication(
  client: SupabaseClientLike,
  input: ApplicationInput,
  locationTagIds: string[] = [],
) {
  const userId = await getCurrentUserId(client);

  const { data, error } = await client
    .from("applications")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  if (locationTagIds.length > 0) {
    try {
      await setApplicationLocations(client, data.id as string, locationTagIds);
    } catch (caught) {
      await client.from("applications").delete().eq("id", data.id);
      throw caught;
    }
  }
  return data as Application;
}

export async function updateApplication(
  client: SupabaseClientLike,
  id: string,
  patch: Partial<ApplicationInput>,
  locationTagIds?: string[],
) {
  const { data, error } = await client
    .from("applications")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  if (locationTagIds) await setApplicationLocations(client, id, locationTagIds);
  return data as Application;
}

export async function deleteApplication(client: SupabaseClientLike, id: string) {
  const { error } = await client.from("applications").delete().eq("id", id);
  if (error) throw error;
}

export async function createEvent(client: SupabaseClientLike, input: EventInput) {
  const userId = await getCurrentUserId(client);

  const { data, error } = await client
    .from("application_events")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(client: SupabaseClientLike, id: string) {
  const { error } = await client.from("application_events").delete().eq("id", id);
  if (error) throw error;
}

export async function listLocationTags(client: SupabaseClientLike) {
  const { data, error } = await client.from("location_tags").select("*").order("label");
  if (error) throw error;
  return (data ?? []) as LocationTag[];
}

export async function createLocationTag(client: SupabaseClientLike, label: string) {
  const userId = await getCurrentUserId(client);
  const { data, error } = await client
    .from("location_tags")
    .insert({ user_id: userId, label: normalizeLocationLabel(label) })
    .select()
    .single();
  if (error) throw error;
  return data as LocationTag;
}

export async function renameLocationTag(client: SupabaseClientLike, id: string, label: string) {
  const { data, error } = await client
    .from("location_tags")
    .update({ label: normalizeLocationLabel(label) })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as LocationTag;
}

export async function deleteLocationTag(client: SupabaseClientLike, id: string) {
  const { error } = await client.from("location_tags").delete().eq("id", id);
  if (error) throw error;
}

export async function setApplicationLocations(
  client: SupabaseClientLike,
  applicationId: string,
  locationTagIds: string[],
) {
  const uniqueIds = [...new Set(locationTagIds)];
  if (uniqueIds.length > 10) throw new Error("An application can have at most 10 locations.");
  const { error } = await client.rpc("set_application_locations", {
    p_application_id: applicationId,
    p_location_tag_ids: uniqueIds,
  });
  if (error) throw error;
}

export async function createFollowUpTask(client: SupabaseClientLike, input: FollowUpTaskInput) {
  const userId = await getCurrentUserId(client);
  const { data, error } = await client
    .from("follow_up_tasks")
    .insert({ ...normalizeTaskInput(input), user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as FollowUpTask;
}

export async function updateFollowUpTask(
  client: SupabaseClientLike,
  id: string,
  input: FollowUpTaskInput,
) {
  const { data, error } = await client
    .from("follow_up_tasks")
    .update(normalizeTaskInput(input))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FollowUpTask;
}

export async function setFollowUpTaskCompleted(
  client: SupabaseClientLike,
  id: string,
  completed: boolean,
) {
  const { data, error } = await client
    .from("follow_up_tasks")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FollowUpTask;
}

export async function deleteFollowUpTask(client: SupabaseClientLike, id: string) {
  const { error } = await client.from("follow_up_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function getProfile(client: SupabaseClientLike) {
  const userId = await getCurrentUserId(client);
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  client: SupabaseClientLike,
  patch: Partial<Pick<
    Profile,
    "display_name" | "avatar_path" | "theme_preference" | "in_app_reminders_enabled" | "reminder_lead_days"
  >>,
) {
  const userId = await getCurrentUserId(client);
  const payload = {
    ...patch,
    ...(patch.display_name === undefined ? {} : { display_name: patch.display_name.trim() }),
  };
  if (payload.display_name !== undefined && !payload.display_name) {
    throw new Error("Display name is required.");
  }
  const { data, error } = await client.from("profiles").update(payload).eq("id", userId).select().single();
  if (error) throw error;
  return data as Profile;
}
