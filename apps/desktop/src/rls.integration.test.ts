import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createApplication,
  createFollowUpTask,
  createLocationTag,
  deleteApplication,
  deleteLocationTag,
  listApplications,
  listLocationTags,
  todayISO,
} from "@job-tracker/core";

const env = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};
const testConfig = {
  url: env.SUPABASE_TEST_URL,
  anonKey: env.SUPABASE_TEST_ANON_KEY,
  userAEmail: env.SUPABASE_TEST_USER_A_EMAIL,
  userAPassword: env.SUPABASE_TEST_USER_A_PASSWORD,
  userBEmail: env.SUPABASE_TEST_USER_B_EMAIL,
  userBPassword: env.SUPABASE_TEST_USER_B_PASSWORD,
};
const configured = Object.values(testConfig).every(Boolean);

describe.skipIf(!configured)("mobile workbench RLS integration", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userAId = "";
  let userBId = "";
  let applicationId = "";
  let locationTagId = "";

  beforeAll(async () => {
    clientA = createClient(testConfig.url!, testConfig.anonKey!, { auth: { persistSession: false } });
    clientB = createClient(testConfig.url!, testConfig.anonKey!, { auth: { persistSession: false } });
    const [authA, authB] = await Promise.all([
      clientA.auth.signInWithPassword({ email: testConfig.userAEmail!, password: testConfig.userAPassword! }),
      clientB.auth.signInWithPassword({ email: testConfig.userBEmail!, password: testConfig.userBPassword! }),
    ]);
    if (authA.error) throw authA.error;
    if (authB.error) throw authB.error;
    userAId = authA.data.user.id;
    userBId = authB.data.user.id;
  });

  afterAll(async () => {
    if (applicationId) await deleteApplication(clientA, applicationId).catch(() => undefined);
    if (locationTagId) await deleteLocationTag(clientA, locationTagId).catch(() => undefined);
    await Promise.all([clientA.auth.signOut(), clientB.auth.signOut()]);
  });

  it("isolates tags, applications, tasks, relations and private avatars", async () => {
    const suffix = Date.now().toString(36);
    const tag = await createLocationTag(clientA, `RLS-${suffix}`);
    locationTagId = tag.id;
    const application = await createApplication(clientA, {
      company_name: `RLS Company ${suffix}`,
      position_name: "RLS verification",
      city: null,
      channel: "integration-test",
      status: "applied",
      priority: "low",
      applied_date: todayISO(),
      next_action_date: null,
      job_url: null,
      salary_range: null,
      resume_version: null,
      contact_name: null,
      contact_info: null,
      notes: null,
    }, [tag.id]);
    applicationId = application.id;
    const task = await createFollowUpTask(clientA, {
      application_id: application.id,
      title: "RLS task",
      notes: null,
      due_date: todayISO(),
    });

    expect((await listApplications(clientB)).some((item) => item.id === application.id)).toBe(false);
    expect((await listLocationTags(clientB)).some((item) => item.id === tag.id)).toBe(false);

    const foreignRelation = await clientB.from("application_location_tags").insert({
      application_id: application.id,
      location_tag_id: tag.id,
      user_id: userBId,
    });
    expect(foreignRelation.error).not.toBeNull();

    const foreignTaskUpdate = await clientB
      .from("follow_up_tasks")
      .update({ title: "must not change" })
      .eq("id", task.id)
      .select();
    expect(foreignTaskUpdate.data).toEqual([]);

    const avatarPath = `${userAId}/rls-${suffix}.png`;
    const tinyPng = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const upload = await clientA.storage.from("avatars").upload(avatarPath, tinyPng, { contentType: "image/png" });
    expect(upload.error).toBeNull();
    const foreignAvatar = await clientB.storage.from("avatars").createSignedUrl(avatarPath, 60);
    expect(foreignAvatar.error).not.toBeNull();
    await clientA.storage.from("avatars").remove([avatarPath]);

    await deleteApplication(clientA, application.id);
    applicationId = "";
    const [remainingTasks, remainingLinks, retainedTag] = await Promise.all([
      clientA.from("follow_up_tasks").select("id").eq("id", task.id),
      clientA.from("application_location_tags").select("application_id").eq("application_id", application.id),
      clientA.from("location_tags").select("id").eq("id", tag.id),
    ]);
    expect(remainingTasks.data).toEqual([]);
    expect(remainingLinks.data).toEqual([]);
    expect(retainedTag.data).toHaveLength(1);
  });
});
