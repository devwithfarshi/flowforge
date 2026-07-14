using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Task 15 contract tests: notification center (filters, unread badge, read/archive/
/// delete), activity feed, and the §7 emit-on-event flow (run → notification honoring
/// UserSettings + audit entries from handlers).
/// </summary>
[Collection(ApiCollection.Name)]
public class NotificationsActivityTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public NotificationsActivityTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> AuthedClient(string name = "Ntf Tester")
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name, email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var accessToken = (await ReadJson(response)).GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    private async Task<List<JsonElement>> Notifications(HttpClient client, string filter = "all") =>
        (await ReadJson(await client.GetAsync($"/api/v1/notifications?filter={filter}"))).EnumerateArray().ToList();

    private static async Task RunWorkflowToCompletion(HttpClient client, string workflowId)
    {
        var run = await client.PostAsync($"/api/v1/workflows/{workflowId}/run", content: null);
        Assert.Equal(HttpStatusCode.Accepted, run.StatusCode);
        var executionId = (await ReadJson(run)).GetProperty("id").GetString();

        var deadline = DateTimeOffset.UtcNow.AddSeconds(30);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var status = (await ReadJson(await client.GetAsync($"/api/v1/executions/{executionId}")))
                .GetProperty("status").GetString();
            if (status is "success" or "failed")
            {
                return;
            }

            await Task.Delay(250);
        }

        throw new TimeoutException("run did not finish");
    }

    [Fact]
    public async Task Run_EmitsNotificationAndActivity_PerEventFlow()
    {
        var client = await AuthedClient("Runner");
        var workflowId = (await ReadJson(await client.PostAsJsonAsync(
            "/api/v1/workflows", new { name = "Notify me" }))).GetProperty("id").GetString()!;

        await RunWorkflowToCompletion(client, workflowId);

        // Event handlers run right after completion — allow a beat for the publish.
        await Task.Delay(500);

        var notifications = await Notifications(client);
        var completed = notifications.Single(n => n.GetProperty("type").GetString() == "workflow_completed");
        Assert.Equal("Notify me completed", completed.GetProperty("title").GetString());
        Assert.False(completed.GetProperty("read").GetBoolean());

        var activity = (await ReadJson(await client.GetAsync("/api/v1/activity?category=workflow")))
            .EnumerateArray().ToList();
        Assert.Contains(activity, a =>
            a.GetProperty("action").GetString() == "ran workflow"
            && a.GetProperty("target").GetString() == "Notify me"
            && a.GetProperty("actor").GetString() == "Runner");
    }

    [Fact]
    public async Task Run_WithNotifyOnSuccessOff_EmitsNoNotification()
    {
        var client = await AuthedClient();
        await client.PatchAsJsonAsync("/api/v1/me/settings", new { notifyOnSuccess = false });
        var workflowId = (await ReadJson(await client.PostAsJsonAsync(
            "/api/v1/workflows", new { name = "Silent" }))).GetProperty("id").GetString()!;

        await RunWorkflowToCompletion(client, workflowId);
        await Task.Delay(500);

        var notifications = await Notifications(client);
        Assert.DoesNotContain(notifications, n => n.GetProperty("type").GetString() == "workflow_completed");
    }

    [Fact]
    public async Task NotificationCenter_ReadArchiveDelete_AndUnreadBadge()
    {
        var client = await AuthedClient();

        // Connecting an integration pushes a notification (mock parity).
        var integrations = (await ReadJson(await client.GetAsync("/api/v1/integrations"))).EnumerateArray();
        var slackId = integrations.Single(i => i.GetProperty("name").GetString() == "Slack")
            .GetProperty("id").GetString();
        await client.PostAsJsonAsync($"/api/v1/integrations/{slackId}/connect", new { label = "Team" });

        var all = await Notifications(client);
        var notification = Assert.Single(all);
        Assert.Equal("integration", notification.GetProperty("type").GetString());
        Assert.Equal("Slack connected", notification.GetProperty("title").GetString());
        var id = notification.GetProperty("id").GetString();

        Assert.Equal(1, (await ReadJson(await client.GetAsync("/api/v1/notifications/unread-count"))).GetInt32());
        Assert.Single(await Notifications(client, "unread"));

        // Read → badge drops.
        await client.PostAsync($"/api/v1/notifications/{id}/read", content: null);
        Assert.Equal(0, (await ReadJson(await client.GetAsync("/api/v1/notifications/unread-count"))).GetInt32());

        // Archive → leaves "all", shows in "archived".
        await client.PostAsJsonAsync($"/api/v1/notifications/{id}/archive", new { archived = true });
        Assert.Empty(await Notifications(client));
        Assert.Single(await Notifications(client, "archived"));

        // Delete → gone everywhere.
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/notifications/{id}")).StatusCode);
        Assert.Empty(await Notifications(client, "archived"));
    }

    [Fact]
    public async Task ReadAll_MarksEverything_AndScopingHolds()
    {
        var client = await AuthedClient();
        var integrations = (await ReadJson(await client.GetAsync("/api/v1/integrations"))).EnumerateArray();
        var gmailId = integrations.Single(i => i.GetProperty("name").GetString() == "Gmail")
            .GetProperty("id").GetString();
        await client.PostAsJsonAsync($"/api/v1/integrations/{gmailId}/connect", new { label = "A" });
        await client.PostAsJsonAsync($"/api/v1/integrations/{gmailId}/connect", new { label = "B" });

        Assert.Equal(2, (await ReadJson(await client.GetAsync("/api/v1/notifications/unread-count"))).GetInt32());

        await client.PostAsync("/api/v1/notifications/read-all", content: null);
        Assert.Equal(0, (await ReadJson(await client.GetAsync("/api/v1/notifications/unread-count"))).GetInt32());

        // Another user has an empty center and can't touch these notifications.
        var intruder = await AuthedClient();
        Assert.Empty(await Notifications(intruder));
        var someId = (await Notifications(client)).First().GetProperty("id").GetString();
        var forbidden = await intruder.PostAsync($"/api/v1/notifications/{someId}/read", content: null);
        Assert.Equal(HttpStatusCode.NotFound, forbidden.StatusCode);
    }

    [Fact]
    public async Task ActivityFeed_RecordsAuditWrites_WithFiltersAndRecent()
    {
        var client = await AuthedClient("Auditor");

        await client.PostAsJsonAsync("/api/v1/workflows", new { name = "Audited" });
        await client.PostAsJsonAsync(
            "/api/v1/variables", new { key = "AUDIT_KEY", value = "v", scope = "global" });

        var all = (await ReadJson(await client.GetAsync("/api/v1/activity"))).EnumerateArray().ToList();
        Assert.Contains(all, a => a.GetProperty("action").GetString() == "created workflow");
        Assert.Contains(all, a => a.GetProperty("action").GetString() == "created variable");

        var variables = (await ReadJson(await client.GetAsync("/api/v1/activity?category=variable")))
            .EnumerateArray().ToList();
        Assert.Equal("AUDIT_KEY", Assert.Single(variables).GetProperty("target").GetString());

        var searched = (await ReadJson(await client.GetAsync("/api/v1/activity?search=audited")))
            .EnumerateArray().ToList();
        Assert.Single(searched);

        var recent = (await ReadJson(await client.GetAsync("/api/v1/activity/recent?n=1")))
            .EnumerateArray().ToList();
        Assert.Single(recent);
    }
}
